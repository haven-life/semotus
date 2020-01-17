import {delay, getError, logTime} from './Utilities';
import {CallContext, ProcessCallPayload, RemoteCall, Semotus, Session} from './Types';


/**
 * We process the call the remote method in stages starting by letting the controller examine the
 * changes (preCallHook) and giving it a chance to refresh data if it needs to.  Then we apply any
 * changes in the messages and give the object owning the method a chance to validate that the
 * call is valid and take care of any authorization concerns.  Finally we let the controller perform
 * any post-call processing such as commiting data and then we deal with a failure or success.
 *
 * @param payload
 * @param {unknown} forceupdate unknown
 *
 * @returns {unknown} unknown
 */

export async function processCall(payload: ProcessCallPayload, forceupdate?: boolean) {

    try {
        forceupdate = await Promise.resolve(forceupdate);
        await preCallHook(payload, forceupdate);
        let validation = await applyChangesAndValidateCall(payload);
        validation = await customValidation(payload, validation);
        const result = await callIfValid(payload, validation);
        await postCallHook(payload, result);
        await postCallSuccess(payload, result);
    } catch (err) {
        await postCallFailure(payload, err);
    }
}


/**
 * If there is an update conflict we want to retry after restoring the session
 *
 * @returns {*} unknown
 */
async function retryCall(payload: ProcessCallPayload) {
    const {semotus, remoteCall, callContext, session, subscriptionId, remoteCallId, restoreSessionCallback} = payload;

    if (restoreSessionCallback) {
        restoreSessionCallback();
    }

    return processCall(payload, true);
}

/**
 * Determine what objects changed and pass this to the preServerCall method on the controller
 *
 * @param payload
 * @param  forceupdate unknown
 *
 * @returns  unknown
 */
function preCallHook(payload: ProcessCallPayload, forceupdate?: boolean): boolean {
    const {semotus, remoteCall, callContext, session, subscriptionId, remoteCallId, restoreSessionCallback} = payload;
    semotus.logger.info(
        {
            component: 'semotus',
            module: 'processCall',
            activity: 'preServerCall',
            data: {
                call: remoteCall.name,
                sequence: remoteCall.sequence
            }
        },
        remoteCall.name
    );

    if (semotus.controller && semotus.controller.preServerCall) {
        let changes = {};

        for (var objId in JSON.parse(remoteCall.changes)) {
            changes[semotus.__dictionary__[objId.replace(/[^-]*-/, '').replace(/-.*/, '')].__name__] = true;
        }

        return semotus.controller.preServerCall.call(
            semotus.controller,
            remoteCall.changes.length > 2,
            changes,
            callContext,
            forceupdate
        );
    } else {
        return true;
    }
}

/**
 * Apply changes in the message and then validate the call.  Throw "Sync Error" if changes can't be applied
 *
 * @returns {unknown} unknown
 */
function applyChangesAndValidateCall(payload: ProcessCallPayload): boolean {
    const {semotus, remoteCall, callContext, session, subscriptionId, remoteCallId, restoreSessionCallback} = payload;

    semotus.logger.info(
        {
            component: 'semotus',
            module: 'processCall',
            activity: 'applyChangesAndValidateCall',
            data: {
                call: remoteCall.name,
                sequence: remoteCall.sequence,
                remoteCallId: remoteCall.id
            }
        },
        remoteCall.name
    );

    let changes = JSON.parse(remoteCall.changes);

    if (semotus._applyChanges(changes, semotus.role === 'client', subscriptionId, callContext)) {
        const obj = session.objects[remoteCall.id];

        if (!obj) {
            throw new Error(`Cannot find object for remote call ${remoteCall.id}`);
        }

        // check to see if this function is supposed to be called directly from client
        if (obj.__proto__[remoteCall.name].__on__ !== 'server') {
            throw 'Invalid Function Call; not an API function';
        }

        if (semotus.role === 'server' && obj.validateServerCall) {
            return obj.validateServerCall.call(obj, remoteCall.name, callContext);
        }

        return true;
    } else {
        throw 'Sync Error';
    }
}

/**
 * Apply function specific custom serverSide validation functions
 *
 * @param semotus
 * @param {boolean} isValid - Result of previous validation step (applyChangesAndValidateCall)
 * @param session
 * @param remoteCall
 * @returns {boolean} True if passed function
 */
function customValidation(payload: ProcessCallPayload, isValid: boolean): boolean {
    const {semotus, remoteCall, callContext, session, subscriptionId, remoteCallId, restoreSessionCallback} = payload;

    let loggerObject = {
        component: 'semotus',
        module: 'processCall',
        activity: 'customValidation',
        data: {
            call: remoteCall.name,
            sequence: remoteCall.sequence,
            remoteCallId: remoteCall.id
        }
    };

    let remoteObject = session.objects[remoteCall.id];

    semotus.logger.info(loggerObject, remoteCall.name);

    if (!isValid) {
        return false;
    } else if (semotus.role === 'server' && remoteObject[remoteCall.name].serverValidation) {
        let args = semotus._extractArguments(remoteCall);
        args.unshift(remoteObject);

        return remoteObject[remoteCall.name].serverValidation.apply(null, args);
    } else {
        return true;
    }
}

/**
 * If the changes could be applied and the validation was successful call the method
 *
 * @param semotus
 * @param {boolean} isValid - takes a flag if the call is valid or not, if it is then we proceed normally,
 * otherwise, we throw an error and stop execution
 *
 * @param session
 * @param remoteCall
 * @returns {unknown} unknown
 */
async function callIfValid(payload: ProcessCallPayload, isValid: boolean) {
    const {semotus, remoteCall, callContext, session, subscriptionId, remoteCallId, restoreSessionCallback} = payload;

    let loggerObject = {
        component: 'semotus',
        module: 'processCall',
        activity: 'callIfValid',
        data: {
            call: remoteCall.name,
            sequence: remoteCall.sequence,
            remoteCallId: remoteCall.id
        }
    };

    semotus.logger.info(loggerObject, remoteCall.name);

    let obj = session.objects[remoteCall.id];

    if (!obj[remoteCall.name]) {
        throw new Error(remoteCall.name + ' function does not exist.');
    }

    if (!isValid && remoteCall && remoteCall.name) {
        throw new Error(remoteCall.name + ' refused');
    }

    let args = semotus._extractArguments(remoteCall);

    return obj[remoteCall.name].apply(obj, args);
}

/**
 * Let the controller know that the method was completed and give it a chance to commit changes
 *
 * @param semotus
 * @param  returnValue unknown
 * @param remoteCall
 * @param callContext
 *
 * @returns
 */
async function postCallHook(payload: ProcessCallPayload, returnValue) {
    const {semotus, remoteCall, callContext, session, subscriptionId, remoteCallId, restoreSessionCallback} = payload;

    if (semotus.controller && semotus.controller.postServerCall) {
        const hasChanges: boolean = remoteCall.changes.length > 2;
        await semotus.controller.postServerCall.call(semotus.controller, hasChanges, callContext, semotus.changeString);
    }
    return returnValue;
}

/**
 * Package up any changes resulting from the execution and send them back in the message, clearing
 * our change queue to accumulate more changes for the next call
 *
 * @param semotus
 * @param remoteCall
 * @param remoteCallId
 * @param {unknown} ret unknown
 */
function postCallSuccess(payload: ProcessCallPayload, ret): void {
    const {semotus, remoteCall, callContext, session, subscriptionId, remoteCallId, restoreSessionCallback} = payload;

    semotus.logger.info(
        {
            component: 'semotus',
            module: 'processCall',
            activity: 'postCall.success',
            data: {
                call: remoteCall.name,
                callTime: logTime(callContext),
                sequence: remoteCall.sequence
            }
        },
        remoteCall.name
    );

    packageChanges.call(semotus, {
        type: 'response',
        sync: true,
        value: JSON.stringify(semotus._toTransport(ret)),
        name: remoteCall.name,
        remoteCallId: remoteCallId
    });
}

/**
 * Helper function to identify if there's a postServerErrorHandler callback on the base controller
 * If there is, we execute the handler, and if we catch an error in the handler, we propogate it up to the logger.
 * @param logger
 * @param {*} controller
 * @param type
 * @param remoteCall
 * @param remoteCallId
 * @param callContext
 * @param changeString
 * @param session
 */
async function resolveErrorHandler(logger, controller, type, remoteCall: RemoteCall, remoteCallId, callContext: CallContext, changeString, session: Session) {

    if (controller && controller.postServerErrorHandler) {
        let errorType = type;
        let functionName = remoteCall.name;
        let obj = undefined;
        if (session.objects[remoteCall.id]) {
            obj = session.objects[remoteCall.id];
        }
        let logBody = {
            component: 'semotus',
            module: 'processCall.failure',
            activity: 'postCall.resolveErrorHandler',
            data: {
                call: remoteCall.name,
                message: undefined
            }
        };

        try {
            await controller.postServerErrorHandler.call(controller, errorType, remoteCallId, obj, functionName, callContext, changeString);
        } catch (error) {
            if (error.message) {
                logBody.data.message = error.message;
                logger.error(error.message);
            } else {
                logBody.data.message = JSON.stringify(error);
            }

            logger.error(logBody, 'User defined postServerErrorHandler threw an error');
        }
    }
}

/**
 * Handle errors by returning an apropriate message.  In all cases changes sent back though they
 *
 * @param semotus
 * @param remoteCall
 * @param callContext
 * @param session
 * @param {unknown} err unknown
 *
 * @returns {unknown} A Promise
 */
async function postCallFailure(payload: ProcessCallPayload, err) {
    const {semotus, remoteCall, callContext, session, subscriptionId, remoteCallId, restoreSessionCallback} = payload;

    let logString = '';

    let packageChangesPayload = {};

    let updateConflictRetry = false;

    if (err === 'Sync Error') {
        postCallErrorLog(semotus.logger, 'postCall.syncError', undefined, 'error', remoteCall.name, remoteCall, callContext);
        packageChangesPayload = {
            type: 'response',
            sync: false,
            changes: ''
        };
    } else if (err.message == 'Update Conflict') {
        // Not this may be caught in the transport (e.g. Amorphic) and retried)

        // increment callContext.retries after checking if < 3. Should retry 3 times.
        if (callContext.retries++ < 3) {
            postCallErrorLog(semotus.logger, 'postCall.updateConflict', undefined, 'warn', remoteCall.name, remoteCall, callContext);
            updateConflictRetry = true;
            // The following assignment is only used for the error handler
            packageChangesPayload = {
                type: 'retry'
            };
        } else {
            postCallErrorLog(semotus.logger, 'postCall.updateConflict', undefined, 'error', remoteCall.name, remoteCall, callContext);
            packageChangesPayload = {
                type: 'retry',
                sync: false
            };
        }
    } else {
        if (!(err instanceof Error)) {
            postCallErrorLog(semotus.logger, 'postCall.error', JSON.stringify(err), 'info', remoteCall.name, remoteCall, callContext);
        } else {
            if (err.stack) {
                logString = 'Exception in ' + remoteCall.name + ' - ' + err.message + (' ' + err.stack);
            } else {
                logString = 'Exception in ' + remoteCall.name + ' - ' + err.message;
            }

            postCallErrorLog(semotus.logger, 'postCall.exception', err.message, 'error', logString, remoteCall, callContext);
        }

        packageChangesPayload = {
            type: 'error',
            sync: true,
            value: getError.call(semotus, err),
            name: remoteCall.name
        };
    }

    Object.assign(packageChangesPayload, {remoteCallId: remoteCallId});

    await resolveErrorHandler(
        semotus.logger,
        semotus.controller,
        // @ts-ignore
        packageChangesPayload.type,
        remoteCall,
        remoteCallId,
        callContext,
        semotus.changeString,
        session
    );

    if (updateConflictRetry) {
        await delay(callContext.retries * 1000);
        return retryCall(payload);
    } else {
        return packageChanges(semotus, session, packageChangesPayload);
    }
}

/**
 * Deal with changes going back to the caller - Actually not Async!
 *
 * @param semotus
 * @param session
 * @param {unknown} message unknown
 */
function packageChanges(semotus: Semotus, session: Session, message) {
    semotus._convertArrayReferencesToChanges();
    message.changes = JSON.stringify(semotus.getChanges());

    if (semotus.memSession && semotus.memSession.semotus && semotus.memSession.semotus.callStartTime) {
        semotus.memSession.semotus.callStartTime = 0;
    }

    session.sendMessage(message);
    semotus._deleteChanges();
    semotus._processQueue();
}


/**
 *  Helper function to log amorphic errors.
 * @param {*} logger
 * @param {*} activity
 * @param {*} message
 * @param {*} logType
 * @param {*} logString
 * @param remoteCall
 * @param callContext
 */
export function postCallErrorLog(logger, activity, message, logType, logString, remoteCall: RemoteCall, callContext: CallContext) {
    let logBody = {
        component: 'semotus',
        module: 'processCall.failure',
        data: {
            call: remoteCall.name,
            callTime: logTime(callContext),
            sequence: remoteCall.sequence,
            message: undefined
        },
        activity: undefined
    };

    logBody.activity = activity;

    if (logger.data) {
        logBody.data.message = message;
    }

    logger[logType](logBody, logString);
}
