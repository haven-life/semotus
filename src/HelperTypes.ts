export type Subscription = {
    role: string;
    log: {
        array: ChangeGroup;
        change: ChangeGroup;
        arrayDirty: ChangeGroup;
    }
}

export type ChangeGroup = { [objId: string]: PropChanges };
type PropChanges = { [prop: string]: Changes };

// Changes[0] is oldValue, Changes[1] is newValue
type Changes = Array<any>;

export type Subscriptions = { [key: string]: Subscription };

export type Session = {
    subscriptions: Subscriptions;
    sendMessage: SendMessage;
    sendMessageEnabled: boolean;
    remoteCalls: Array<any>;
    pendingRemoteCalls: any;
    nextPendingRemoteCallId: number;
    nextSaveSessionId: number;
    savedSessionId: number;
    nextSubscriptionId: number;
    objects: any;
    nextObjId: number;
    dispenseNextId: null; // not used anywhere
}


export type Sessions = { [sessionId: number]: Session };

export type SendMessage = (message: any) => void;

export type SavedSession = {
    revision: number;
    data: string; // Serialized Session data
    callCount: number;
    referenced: number;
};

export interface Semotus {
    _injectIntoTemplate: (template) => void;
    serializeAndGarbageCollect: () => any;
    getMessage: (sessionId, forceMessage) => any;
    clearPendingCalls: (sessionId) => void;
    getChangeGroup: (type, subscriptionId) => ChangeGroup;
    deleteChangeGroup: (type: any, subscriptionId: any) => void;
    getChangeStatus: () => string;
    _stashObject: (obj, template) => boolean;
    sessionize: (obj, referencingObj) => (undefined | any);
    _setupFunction: (propertyName, propertyValue, role, validate, serverValidation, template) => (any);
    _setupProperty: (propertyName, defineProperty, objectProperties, defineProperties) => void;
    withoutChangeTracking: (cb) => void;
    _createChanges: (defineProperty, template) => boolean;
    _acceptChanges: (defineProperty, template) => boolean;
    _generateChanges: () => void;
    _manageChanges: (defineProperty) => boolean;
    _logChanges: (obj) => void;
    _changedValue: (obj, prop, value) => void;
    _referencedArray: (obj, prop, arrayRef, sessionId) => void;
    _convertArrayReferencesToChanges: () => void;
    MarkChangedArrayReferences: () => void;
    _convertValue: (value) => (any[] | null);
    getObject: (objId, template) => (any | null);
    _applyChanges: (changes, force, subscriptionId, callContext) => (number);
    _applyObjectChanges: (changes, rollback, obj, force) => (boolean);
    _validateServerIncomingProperty: (obj, prop, defineProperty, newValue) => (boolean);
    _applyPropertyChange: (changes, rollback, obj, prop, ix, oldValue, newValue, force) => (boolean);
    _rollback: (rollback) => void;
    _rollbackChanges: () => void;
    _createEmptyObject: (template, objId, defineProperty, isTransient) => any;
    inject: (template, injector) => void;
    _queueRemoteCall: (objId, functionName, deferred, args) => void;
    _processQueue: () => void;
    _toTransport: (obj) => any;
    _fromTransport: (obj) => any;
    _extractArguments: (remoteCall) => any;
    _trimArray: (array) => void;
    _getSession: (_sid?: any) => Session;
    _deleteChangeGroups: (type) => void;
    _getSubscriptions: (sessionId) => Subscriptions | null;
    _getSubscription: (subscriptionId) => Subscription;
    cleanPrivateValues: (prop, logValue, defineProperty) => (string | any);
    Remoteable: (Base) => () => any;
    Bindable: (Base) => () => any;
    Persistable: (Base) => () => any;
    bindDecorators: (objectTemplate?) => void;
    processMessage: (remoteCall, subscriptionId, restoreSessionCallback) => (undefined | any);
    enableSendMessage: (value, messageCallback, sessionId) => void;
    syncSession: (sessionId) => void;
    restoreSession: (sessionId, savedSession: SavedSession, sendMessage: SendMessage) => boolean;
    saveSession: (sessionId) => SavedSession;
    setMinimumSequence: (nextObjId) => void;
    deleteSession: (sessionId) => void;
    createSession: (role: any, sendMessage: SendMessage, sessionId: any) => any;
    log: (level, data) => void;
    nextObjId: number;
    maxClientSequence: number;
    logLevel: number;
    __conflictMode__: string;
    __changeTracking__: boolean;
    _useGettersSetters: boolean;
    logger: any;
    role: any;
    currentSession: any;
    sessions?: Sessions;
    nextSubscriptionId: number;
    nextSessionId: number;

    subscribe(role: any): number;

    setSession(sessionId: any): void;

    getChanges(subscriptionId?: any): ChangeGroup;

    _deleteChanges(): void;

    getPendingCallCount(sessionId: any): any;
}
