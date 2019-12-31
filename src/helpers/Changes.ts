import {Semotus} from './Types';

/**
 * Helper function to determine if we should not create changes for the property this defineProperty metadata is associated with
 *
 *
 * @param defineProperty
 * @param template
 * @param RemoteObjectTemplate
 */
export function doNotChange(defineProperty, template, RemoteObjectTemplate: Semotus) {
    if (defineProperty.isLocal) { // If we've defined the property as local to where it's created / modified
        return true;
    } else if (defineProperty.toServer === false && RemoteObjectTemplate.role === 'client') {
        return true; // If we're trying to send property to the server from client, when prop's toServer == false;
    } else if (defineProperty.toClient === false && RemoteObjectTemplate.role === 'server') {
        return true; // If we're trying to send property to the client from server, when prop's toClient == false;
    } else if (template.__toServer__ === false && RemoteObjectTemplate.role == 'client') {
        return true; // If we're trying to send property to the server from client, when the whole template has toServer == false;
    } else if (template.__toClient__ === false && RemoteObjectTemplate.role === 'server') {
        return true; // If we're trying to send property to the client from server, when the whole template has toClient == false;
    }
    return false;
}


/**
 * Helper function to determine if we should not accept changes for the property this defineProperty metadata is associated with
 *
 *
 * @param defineProperty
 * @param template
 * @param RemoteObjectTemplate
 */
export function doNotAccept(defineProperty, template, RemoteObjectTemplate: Semotus) {
    if (defineProperty.isLocal) { // If we've defined the property as local to where it's created / modified
        return true;
    } else if (defineProperty.toServer === false && RemoteObjectTemplate.role === 'server') {
        return true; // If we're trying to accept changes where toServer == false, but we're on the server
    } else if (defineProperty.toClient === false && RemoteObjectTemplate.role === 'client') {
        return true; // If we're trying to accept changes where toClient is false, but we're on the client
    } else if (template.__toServer__ === false && RemoteObjectTemplate.role == 'server') {
        return true; // If we're trying to accept changes where template's toServer == false, but we're on the server
    } else if (template.__toClient__ === false && RemoteObjectTemplate.role === 'client') {
        return true; // If we're trying to accept changes where template's toClient is false, but we're on the client
    }
    return false;
}

/**
 * Determine whether changes should be accepted for a property
 *
 * @param defineProperty unknown
 * @param template unknown
 * @param semotus
 *
 * @returns {Boolean} unknown
 *
 * @private
 */
export function accept(defineProperty, template: any = {}, semotus: Semotus) {
    return !(doNotAccept(defineProperty, template, semotus));
}


/**
 * Determine whether changes need to be created for a property
 *
 * @param defineProperty unknown
 * @param template unknown
 * @param semotus
 *
 * @returns {Boolean} unknown
 *
 * @private
 */
export function create(defineProperty, template: any = {}, semotus: Semotus) {
    return !(doNotChange(defineProperty, template, semotus));
}


/**
 * Determine whether any tracking of old values is needed
 *
 *
 * For a specific property if isLocal is true, it means that the property will never be synced over the wire
 * If toServer === false AND toClient === false, it is another indicator that this property will never be synced over the wire
 * @param defineProperty unknown
 *
 * @returns {Boolean} unknown
 *
 * @private
 */
export function manage(defineProperty) {
    const isLocal = defineProperty.isLocal === true;
    const isLocalAlt = defineProperty.toServer === false && defineProperty.toClient === false;
    return !(isLocal || isLocalAlt);
}