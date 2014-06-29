/**
 * Base class for errors.
 * You probably shouldn't throw one of these, but instead subclass it or use
 *  one of the supplied Error types below.
 */
function ExtendableError() {
   var tmp = Error.apply(this, arguments);
   this.stack = tmp.stack;
   this.stack = this.stack.replace(/^Error/, this.name);
   this.message = tmp.message;
}
ExtendableError.prototype = Object.create(Error.prototype);
ExtendableError.prototype.name = 'ExtendableError';
ExtendableError.prototype.constructor = ExtendableError;

/**
 * Throw when input is unexceptable.
 */
function InputError(fieldName, humanReadableExpectedValue) {
   ExtendableError.call(this, fieldName + ' has an invalid value');
   this.fieldName = fieldName;
   this.humanReadableExpectedValue = humanReadableExpectedValue;
}
InputError.prototype = Object.create(ExtendableError.prototype);
InputError.prototype.name = 'InputError';
InputError.prototype.constructor = InputError;

/**
 * Throw when function isn't ready to be called, and doesn't want to deal with
 *  queues and asynchronous stuff.
 */
function NotReadyError() {
   ExtendableError.apply(this, arguments);
}
NotReadyError.prototype = Object.create(ExtendableError.prototype);
NotReadyError.prototype.name = 'NotReadyError';
NotReadyError.prototype.constructor = NotReadyError;

/**
 * Throw if after doing a piece of logic something should be true and it's not.
 */
function LogicError() {
   ExtendableError.apply(this, arguments);
}
NotReadyError.prototype = Object.create(ExtendableError.prototype);
NotReadyError.prototype.name = 'NotReadyError';
NotReadyError.prototype.constructor = NotReadyError;

/**
 * Throw if a piece of functionality isn't implemented yet but it was used
 *  anyway.
 */
function NotImplementedError() {
   ExtendableError.apply(this, arguments);
}
NotImplementedError.prototype = Object.create(ExtendableError.prototype);
NotImplementedError.prototype.name = 'NotImplementedError';
NotImplementedError.prototype.constructor = NotImplementedError;
