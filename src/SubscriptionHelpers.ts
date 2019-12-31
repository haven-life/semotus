import * as SessionHelpers from './SessionHelpers';
import {Semotus, Subscription, Subscriptions} from './HelperTypes';

/**
 * Purpose unknown
 *
 * @param semotus
 * @param {unknown} subscriptionId unknown
 *
 * @returns {unknown} unknown
 *
 * @private
 */

export function getSubscription(semotus: Semotus, subscriptionId): Subscription {
    return SessionHelpers.getSession(semotus).subscriptions[subscriptionId || 0];
}

/**
 * Purpose unknown
 *
 * @param semotus
 * @param {unknown} sessionId unknown
 *
 * @returns {unknown} unknown
 *
 * @private
 */
export function getSubscriptions(semotus: Semotus, sessionId): null | Subscriptions {
    const session = SessionHelpers.getSession(semotus, sessionId);

    if (session) {
        return session.subscriptions;
    } else {
        return null;
    }
}

/**
 * Subscribe to changes and optionally establish subscription as the
 * sole recipient of remote call messages.  Change tracking is then managed
 * by the functions that follow.
 *
 * @param semotus
 * @param {unknown} role unknown
 *
 * @returns {*} unknown
 */
export function subscribe(semotus: Semotus, role) {
    const session = SessionHelpers.getSession(semotus);
    const subscriptionId = session.nextSubscriptionId++;

    session.subscriptions[subscriptionId] = {
        role: role,
        log: {
            array: {},
            change: {},
            arrayDirty: {}
        }
    };

    return subscriptionId;
}