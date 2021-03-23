/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars*/
"use strict";

var $protobuf = require("protobufjs/minimal");

// Common aliases
var $Reader = $protobuf.Reader, $Writer = $protobuf.Writer, $util = $protobuf.util;

// Exported root namespace
var $root = $protobuf.roots["default"] || ($protobuf.roots["default"] = {});

/**
 * METHOD enum.
 * @exports METHOD
 * @enum {number}
 * @property {number} UNKNOWN=0 UNKNOWN value
 * @property {number} GET_INFO=1 GET_INFO value
 * @property {number} CREATE_PROJECT=2 CREATE_PROJECT value
 * @property {number} CREATE_DIRECTORY=3 CREATE_DIRECTORY value
 * @property {number} UPDATE_VERSION=4 UPDATE_VERSION value
 * @property {number} UPDATE_FILE=5 UPDATE_FILE value
 * @property {number} DELETE_FILE=6 DELETE_FILE value
 * @property {number} DELETE_DIRECTORY=7 DELETE_DIRECTORY value
 * @property {number} DELETE_PROJECT=8 DELETE_PROJECT value
 * @property {number} EXECUTE_FILE=9 EXECUTE_FILE value
 * @property {number} INTERRUPT=10 INTERRUPT value
 * @property {number} LOG=11 LOG value
 * @property {number} STOPPED=12 STOPPED value
 */
$root.METHOD = (function() {
    var valuesById = {}, values = Object.create(valuesById);
    values[valuesById[0] = "UNKNOWN"] = 0;
    values[valuesById[1] = "GET_INFO"] = 1;
    values[valuesById[2] = "CREATE_PROJECT"] = 2;
    values[valuesById[3] = "CREATE_DIRECTORY"] = 3;
    values[valuesById[4] = "UPDATE_VERSION"] = 4;
    values[valuesById[5] = "UPDATE_FILE"] = 5;
    values[valuesById[6] = "DELETE_FILE"] = 6;
    values[valuesById[7] = "DELETE_DIRECTORY"] = 7;
    values[valuesById[8] = "DELETE_PROJECT"] = 8;
    values[valuesById[9] = "EXECUTE_FILE"] = 9;
    values[valuesById[10] = "INTERRUPT"] = 10;
    values[valuesById[11] = "LOG"] = 11;
    values[valuesById[12] = "STOPPED"] = 12;
    return values;
})();

$root.Message = (function() {

    /**
     * Properties of a Message.
     * @exports IMessage
     * @interface IMessage
     * @property {METHOD|null} [method] Message method
     * @property {string|null} [name] Message name
     * @property {string|null} [feature] Message feature
     * @property {number|null} [version] Message version
     * @property {string|null} [path] Message path
     * @property {Uint8Array|null} [data] Message data
     * @property {string|null} [message] Message message
     * @property {number|null} [line] Message line
     */

    /**
     * Constructs a new Message.
     * @exports Message
     * @classdesc Represents a Message.
     * @implements IMessage
     * @constructor
     * @param {IMessage=} [properties] Properties to set
     */
    function Message(properties) {
        if (properties)
            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * Message method.
     * @member {METHOD} method
     * @memberof Message
     * @instance
     */
    Message.prototype.method = 0;

    /**
     * Message name.
     * @member {string} name
     * @memberof Message
     * @instance
     */
    Message.prototype.name = "";

    /**
     * Message feature.
     * @member {string} feature
     * @memberof Message
     * @instance
     */
    Message.prototype.feature = "";

    /**
     * Message version.
     * @member {number} version
     * @memberof Message
     * @instance
     */
    Message.prototype.version = 0;

    /**
     * Message path.
     * @member {string} path
     * @memberof Message
     * @instance
     */
    Message.prototype.path = "";

    /**
     * Message data.
     * @member {Uint8Array} data
     * @memberof Message
     * @instance
     */
    Message.prototype.data = $util.newBuffer([]);

    /**
     * Message message.
     * @member {string} message
     * @memberof Message
     * @instance
     */
    Message.prototype.message = "";

    /**
     * Message line.
     * @member {number} line
     * @memberof Message
     * @instance
     */
    Message.prototype.line = 0;

    /**
     * Creates a new Message instance using the specified properties.
     * @function create
     * @memberof Message
     * @static
     * @param {IMessage=} [properties] Properties to set
     * @returns {Message} Message instance
     */
    Message.create = function create(properties) {
        return new Message(properties);
    };

    /**
     * Encodes the specified Message message. Does not implicitly {@link Message.verify|verify} messages.
     * @function encode
     * @memberof Message
     * @static
     * @param {IMessage} message Message message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    Message.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        if (message.method != null && Object.hasOwnProperty.call(message, "method"))
            writer.uint32(/* id 1, wireType 0 =*/8).int32(message.method);
        if (message.name != null && Object.hasOwnProperty.call(message, "name"))
            writer.uint32(/* id 2, wireType 2 =*/18).string(message.name);
        if (message.feature != null && Object.hasOwnProperty.call(message, "feature"))
            writer.uint32(/* id 3, wireType 2 =*/26).string(message.feature);
        if (message.version != null && Object.hasOwnProperty.call(message, "version"))
            writer.uint32(/* id 4, wireType 0 =*/32).int32(message.version);
        if (message.path != null && Object.hasOwnProperty.call(message, "path"))
            writer.uint32(/* id 5, wireType 2 =*/42).string(message.path);
        if (message.data != null && Object.hasOwnProperty.call(message, "data"))
            writer.uint32(/* id 6, wireType 2 =*/50).bytes(message.data);
        if (message.message != null && Object.hasOwnProperty.call(message, "message"))
            writer.uint32(/* id 7, wireType 2 =*/58).string(message.message);
        if (message.line != null && Object.hasOwnProperty.call(message, "line"))
            writer.uint32(/* id 8, wireType 0 =*/64).int32(message.line);
        return writer;
    };

    /**
     * Encodes the specified Message message, length delimited. Does not implicitly {@link Message.verify|verify} messages.
     * @function encodeDelimited
     * @memberof Message
     * @static
     * @param {IMessage} message Message message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    Message.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a Message message from the specified reader or buffer.
     * @function decode
     * @memberof Message
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {Message} Message
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    Message.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        var end = length === undefined ? reader.len : reader.pos + length, message = new $root.Message();
        while (reader.pos < end) {
            var tag = reader.uint32();
            switch (tag >>> 3) {
            case 1:
                message.method = reader.int32();
                break;
            case 2:
                message.name = reader.string();
                break;
            case 3:
                message.feature = reader.string();
                break;
            case 4:
                message.version = reader.int32();
                break;
            case 5:
                message.path = reader.string();
                break;
            case 6:
                message.data = reader.bytes();
                break;
            case 7:
                message.message = reader.string();
                break;
            case 8:
                message.line = reader.int32();
                break;
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        return message;
    };

    /**
     * Decodes a Message message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof Message
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {Message} Message
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    Message.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a Message message.
     * @function verify
     * @memberof Message
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    Message.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        if (message.method != null && message.hasOwnProperty("method"))
            switch (message.method) {
            default:
                return "method: enum value expected";
            case 0:
            case 1:
            case 2:
            case 3:
            case 4:
            case 5:
            case 6:
            case 7:
            case 8:
            case 9:
            case 10:
            case 11:
            case 12:
                break;
            }
        if (message.name != null && message.hasOwnProperty("name"))
            if (!$util.isString(message.name))
                return "name: string expected";
        if (message.feature != null && message.hasOwnProperty("feature"))
            if (!$util.isString(message.feature))
                return "feature: string expected";
        if (message.version != null && message.hasOwnProperty("version"))
            if (!$util.isInteger(message.version))
                return "version: integer expected";
        if (message.path != null && message.hasOwnProperty("path"))
            if (!$util.isString(message.path))
                return "path: string expected";
        if (message.data != null && message.hasOwnProperty("data"))
            if (!(message.data && typeof message.data.length === "number" || $util.isString(message.data)))
                return "data: buffer expected";
        if (message.message != null && message.hasOwnProperty("message"))
            if (!$util.isString(message.message))
                return "message: string expected";
        if (message.line != null && message.hasOwnProperty("line"))
            if (!$util.isInteger(message.line))
                return "line: integer expected";
        return null;
    };

    /**
     * Creates a Message message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof Message
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {Message} Message
     */
    Message.fromObject = function fromObject(object) {
        if (object instanceof $root.Message)
            return object;
        var message = new $root.Message();
        switch (object.method) {
        case "UNKNOWN":
        case 0:
            message.method = 0;
            break;
        case "GET_INFO":
        case 1:
            message.method = 1;
            break;
        case "CREATE_PROJECT":
        case 2:
            message.method = 2;
            break;
        case "CREATE_DIRECTORY":
        case 3:
            message.method = 3;
            break;
        case "UPDATE_VERSION":
        case 4:
            message.method = 4;
            break;
        case "UPDATE_FILE":
        case 5:
            message.method = 5;
            break;
        case "DELETE_FILE":
        case 6:
            message.method = 6;
            break;
        case "DELETE_DIRECTORY":
        case 7:
            message.method = 7;
            break;
        case "DELETE_PROJECT":
        case 8:
            message.method = 8;
            break;
        case "EXECUTE_FILE":
        case 9:
            message.method = 9;
            break;
        case "INTERRUPT":
        case 10:
            message.method = 10;
            break;
        case "LOG":
        case 11:
            message.method = 11;
            break;
        case "STOPPED":
        case 12:
            message.method = 12;
            break;
        }
        if (object.name != null)
            message.name = String(object.name);
        if (object.feature != null)
            message.feature = String(object.feature);
        if (object.version != null)
            message.version = object.version | 0;
        if (object.path != null)
            message.path = String(object.path);
        if (object.data != null)
            if (typeof object.data === "string")
                $util.base64.decode(object.data, message.data = $util.newBuffer($util.base64.length(object.data)), 0);
            else if (object.data.length)
                message.data = object.data;
        if (object.message != null)
            message.message = String(object.message);
        if (object.line != null)
            message.line = object.line | 0;
        return message;
    };

    /**
     * Creates a plain object from a Message message. Also converts values to other types if specified.
     * @function toObject
     * @memberof Message
     * @static
     * @param {Message} message Message
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    Message.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        var object = {};
        if (options.defaults) {
            object.method = options.enums === String ? "UNKNOWN" : 0;
            object.name = "";
            object.feature = "";
            object.version = 0;
            object.path = "";
            if (options.bytes === String)
                object.data = "";
            else {
                object.data = [];
                if (options.bytes !== Array)
                    object.data = $util.newBuffer(object.data);
            }
            object.message = "";
            object.line = 0;
        }
        if (message.method != null && message.hasOwnProperty("method"))
            object.method = options.enums === String ? $root.METHOD[message.method] : message.method;
        if (message.name != null && message.hasOwnProperty("name"))
            object.name = message.name;
        if (message.feature != null && message.hasOwnProperty("feature"))
            object.feature = message.feature;
        if (message.version != null && message.hasOwnProperty("version"))
            object.version = message.version;
        if (message.path != null && message.hasOwnProperty("path"))
            object.path = message.path;
        if (message.data != null && message.hasOwnProperty("data"))
            object.data = options.bytes === String ? $util.base64.encode(message.data, 0, message.data.length) : options.bytes === Array ? Array.prototype.slice.call(message.data) : message.data;
        if (message.message != null && message.hasOwnProperty("message"))
            object.message = message.message;
        if (message.line != null && message.hasOwnProperty("line"))
            object.line = message.line;
        return object;
    };

    /**
     * Converts this Message to JSON.
     * @function toJSON
     * @memberof Message
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    Message.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    return Message;
})();

module.exports = $root;
