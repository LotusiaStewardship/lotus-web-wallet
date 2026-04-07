/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars*/
"use strict";

var $protobuf = require("protobufjs/minimal");

// Common aliases
var $Reader = $protobuf.Reader, $Writer = $protobuf.Writer, $util = $protobuf.util;

// Exported root namespace
var $root = $protobuf.roots["default"] || ($protobuf.roots["default"] = {});

$root.relay = (function() {

    /**
     * Namespace relay.
     * @exports relay
     * @namespace
     */
    var relay = {};

    relay.Header = (function() {

        /**
         * Properties of a Header.
         * @memberof relay
         * @interface IHeader
         * @property {string|null} [name] Header name
         * @property {string|null} [value] Header value
         */

        /**
         * Constructs a new Header.
         * @memberof relay
         * @classdesc Represents a Header.
         * @implements IHeader
         * @constructor
         * @param {relay.IHeader=} [properties] Properties to set
         */
        function Header(properties) {
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Header name.
         * @member {string} name
         * @memberof relay.Header
         * @instance
         */
        Header.prototype.name = "";

        /**
         * Header value.
         * @member {string} value
         * @memberof relay.Header
         * @instance
         */
        Header.prototype.value = "";

        /**
         * Creates a new Header instance using the specified properties.
         * @function create
         * @memberof relay.Header
         * @static
         * @param {relay.IHeader=} [properties] Properties to set
         * @returns {relay.Header} Header instance
         */
        Header.create = function create(properties) {
            return new Header(properties);
        };

        /**
         * Encodes the specified Header message. Does not implicitly {@link relay.Header.verify|verify} messages.
         * @function encode
         * @memberof relay.Header
         * @static
         * @param {relay.IHeader} message Header message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Header.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.name != null && Object.hasOwnProperty.call(message, "name"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.name);
            if (message.value != null && Object.hasOwnProperty.call(message, "value"))
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.value);
            return writer;
        };

        /**
         * Encodes the specified Header message, length delimited. Does not implicitly {@link relay.Header.verify|verify} messages.
         * @function encodeDelimited
         * @memberof relay.Header
         * @static
         * @param {relay.IHeader} message Header message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Header.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a Header message from the specified reader or buffer.
         * @function decode
         * @memberof relay.Header
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {relay.Header} Header
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Header.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.relay.Header();
            while (reader.pos < end) {
                var tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.name = reader.string();
                        break;
                    }
                case 2: {
                        message.value = reader.string();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a Header message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof relay.Header
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {relay.Header} Header
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Header.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a Header message.
         * @function verify
         * @memberof relay.Header
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        Header.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.name != null && message.hasOwnProperty("name"))
                if (!$util.isString(message.name))
                    return "name: string expected";
            if (message.value != null && message.hasOwnProperty("value"))
                if (!$util.isString(message.value))
                    return "value: string expected";
            return null;
        };

        /**
         * Creates a Header message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof relay.Header
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {relay.Header} Header
         */
        Header.fromObject = function fromObject(object) {
            if (object instanceof $root.relay.Header)
                return object;
            var message = new $root.relay.Header();
            if (object.name != null)
                message.name = String(object.name);
            if (object.value != null)
                message.value = String(object.value);
            return message;
        };

        /**
         * Creates a plain object from a Header message. Also converts values to other types if specified.
         * @function toObject
         * @memberof relay.Header
         * @static
         * @param {relay.Header} message Header
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        Header.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.defaults) {
                object.name = "";
                object.value = "";
            }
            if (message.name != null && message.hasOwnProperty("name"))
                object.name = message.name;
            if (message.value != null && message.hasOwnProperty("value"))
                object.value = message.value;
            return object;
        };

        /**
         * Converts this Header to JSON.
         * @function toJSON
         * @memberof relay.Header
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        Header.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for Header
         * @function getTypeUrl
         * @memberof relay.Header
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        Header.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/relay.Header";
        };

        return Header;
    })();

    relay.ProfileEntry = (function() {

        /**
         * Properties of a ProfileEntry.
         * @memberof relay
         * @interface IProfileEntry
         * @property {string|null} [kind] ProfileEntry kind
         * @property {Array.<relay.IHeader>|null} [headers] ProfileEntry headers
         * @property {Uint8Array|null} [body] ProfileEntry body
         */

        /**
         * Constructs a new ProfileEntry.
         * @memberof relay
         * @classdesc Represents a ProfileEntry.
         * @implements IProfileEntry
         * @constructor
         * @param {relay.IProfileEntry=} [properties] Properties to set
         */
        function ProfileEntry(properties) {
            this.headers = [];
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * ProfileEntry kind.
         * @member {string} kind
         * @memberof relay.ProfileEntry
         * @instance
         */
        ProfileEntry.prototype.kind = "";

        /**
         * ProfileEntry headers.
         * @member {Array.<relay.IHeader>} headers
         * @memberof relay.ProfileEntry
         * @instance
         */
        ProfileEntry.prototype.headers = $util.emptyArray;

        /**
         * ProfileEntry body.
         * @member {Uint8Array} body
         * @memberof relay.ProfileEntry
         * @instance
         */
        ProfileEntry.prototype.body = $util.newBuffer([]);

        /**
         * Creates a new ProfileEntry instance using the specified properties.
         * @function create
         * @memberof relay.ProfileEntry
         * @static
         * @param {relay.IProfileEntry=} [properties] Properties to set
         * @returns {relay.ProfileEntry} ProfileEntry instance
         */
        ProfileEntry.create = function create(properties) {
            return new ProfileEntry(properties);
        };

        /**
         * Encodes the specified ProfileEntry message. Does not implicitly {@link relay.ProfileEntry.verify|verify} messages.
         * @function encode
         * @memberof relay.ProfileEntry
         * @static
         * @param {relay.IProfileEntry} message ProfileEntry message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ProfileEntry.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.kind != null && Object.hasOwnProperty.call(message, "kind"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.kind);
            if (message.headers != null && message.headers.length)
                for (var i = 0; i < message.headers.length; ++i)
                    $root.relay.Header.encode(message.headers[i], writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
            if (message.body != null && Object.hasOwnProperty.call(message, "body"))
                writer.uint32(/* id 3, wireType 2 =*/26).bytes(message.body);
            return writer;
        };

        /**
         * Encodes the specified ProfileEntry message, length delimited. Does not implicitly {@link relay.ProfileEntry.verify|verify} messages.
         * @function encodeDelimited
         * @memberof relay.ProfileEntry
         * @static
         * @param {relay.IProfileEntry} message ProfileEntry message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ProfileEntry.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a ProfileEntry message from the specified reader or buffer.
         * @function decode
         * @memberof relay.ProfileEntry
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {relay.ProfileEntry} ProfileEntry
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ProfileEntry.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.relay.ProfileEntry();
            while (reader.pos < end) {
                var tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.kind = reader.string();
                        break;
                    }
                case 2: {
                        if (!(message.headers && message.headers.length))
                            message.headers = [];
                        message.headers.push($root.relay.Header.decode(reader, reader.uint32()));
                        break;
                    }
                case 3: {
                        message.body = reader.bytes();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a ProfileEntry message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof relay.ProfileEntry
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {relay.ProfileEntry} ProfileEntry
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ProfileEntry.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a ProfileEntry message.
         * @function verify
         * @memberof relay.ProfileEntry
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        ProfileEntry.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.kind != null && message.hasOwnProperty("kind"))
                if (!$util.isString(message.kind))
                    return "kind: string expected";
            if (message.headers != null && message.hasOwnProperty("headers")) {
                if (!Array.isArray(message.headers))
                    return "headers: array expected";
                for (var i = 0; i < message.headers.length; ++i) {
                    var error = $root.relay.Header.verify(message.headers[i]);
                    if (error)
                        return "headers." + error;
                }
            }
            if (message.body != null && message.hasOwnProperty("body"))
                if (!(message.body && typeof message.body.length === "number" || $util.isString(message.body)))
                    return "body: buffer expected";
            return null;
        };

        /**
         * Creates a ProfileEntry message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof relay.ProfileEntry
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {relay.ProfileEntry} ProfileEntry
         */
        ProfileEntry.fromObject = function fromObject(object) {
            if (object instanceof $root.relay.ProfileEntry)
                return object;
            var message = new $root.relay.ProfileEntry();
            if (object.kind != null)
                message.kind = String(object.kind);
            if (object.headers) {
                if (!Array.isArray(object.headers))
                    throw TypeError(".relay.ProfileEntry.headers: array expected");
                message.headers = [];
                for (var i = 0; i < object.headers.length; ++i) {
                    if (typeof object.headers[i] !== "object")
                        throw TypeError(".relay.ProfileEntry.headers: object expected");
                    message.headers[i] = $root.relay.Header.fromObject(object.headers[i]);
                }
            }
            if (object.body != null)
                if (typeof object.body === "string")
                    $util.base64.decode(object.body, message.body = $util.newBuffer($util.base64.length(object.body)), 0);
                else if (object.body.length >= 0)
                    message.body = object.body;
            return message;
        };

        /**
         * Creates a plain object from a ProfileEntry message. Also converts values to other types if specified.
         * @function toObject
         * @memberof relay.ProfileEntry
         * @static
         * @param {relay.ProfileEntry} message ProfileEntry
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        ProfileEntry.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.arrays || options.defaults)
                object.headers = [];
            if (options.defaults) {
                object.kind = "";
                if (options.bytes === String)
                    object.body = "";
                else {
                    object.body = [];
                    if (options.bytes !== Array)
                        object.body = $util.newBuffer(object.body);
                }
            }
            if (message.kind != null && message.hasOwnProperty("kind"))
                object.kind = message.kind;
            if (message.headers && message.headers.length) {
                object.headers = [];
                for (var j = 0; j < message.headers.length; ++j)
                    object.headers[j] = $root.relay.Header.toObject(message.headers[j], options);
            }
            if (message.body != null && message.hasOwnProperty("body"))
                object.body = options.bytes === String ? $util.base64.encode(message.body, 0, message.body.length) : options.bytes === Array ? Array.prototype.slice.call(message.body) : message.body;
            return object;
        };

        /**
         * Converts this ProfileEntry to JSON.
         * @function toJSON
         * @memberof relay.ProfileEntry
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        ProfileEntry.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for ProfileEntry
         * @function getTypeUrl
         * @memberof relay.ProfileEntry
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        ProfileEntry.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/relay.ProfileEntry";
        };

        return ProfileEntry;
    })();

    relay.Profile = (function() {

        /**
         * Properties of a Profile.
         * @memberof relay
         * @interface IProfile
         * @property {number|Long|null} [timestamp] Profile timestamp
         * @property {number|Long|null} [ttl] Profile ttl
         * @property {Array.<relay.IProfileEntry>|null} [entries] Profile entries
         */

        /**
         * Constructs a new Profile.
         * @memberof relay
         * @classdesc Represents a Profile.
         * @implements IProfile
         * @constructor
         * @param {relay.IProfile=} [properties] Properties to set
         */
        function Profile(properties) {
            this.entries = [];
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Profile timestamp.
         * @member {number|Long} timestamp
         * @memberof relay.Profile
         * @instance
         */
        Profile.prototype.timestamp = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * Profile ttl.
         * @member {number|Long} ttl
         * @memberof relay.Profile
         * @instance
         */
        Profile.prototype.ttl = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * Profile entries.
         * @member {Array.<relay.IProfileEntry>} entries
         * @memberof relay.Profile
         * @instance
         */
        Profile.prototype.entries = $util.emptyArray;

        /**
         * Creates a new Profile instance using the specified properties.
         * @function create
         * @memberof relay.Profile
         * @static
         * @param {relay.IProfile=} [properties] Properties to set
         * @returns {relay.Profile} Profile instance
         */
        Profile.create = function create(properties) {
            return new Profile(properties);
        };

        /**
         * Encodes the specified Profile message. Does not implicitly {@link relay.Profile.verify|verify} messages.
         * @function encode
         * @memberof relay.Profile
         * @static
         * @param {relay.IProfile} message Profile message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Profile.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.timestamp != null && Object.hasOwnProperty.call(message, "timestamp"))
                writer.uint32(/* id 1, wireType 0 =*/8).int64(message.timestamp);
            if (message.ttl != null && Object.hasOwnProperty.call(message, "ttl"))
                writer.uint32(/* id 2, wireType 0 =*/16).int64(message.ttl);
            if (message.entries != null && message.entries.length)
                for (var i = 0; i < message.entries.length; ++i)
                    $root.relay.ProfileEntry.encode(message.entries[i], writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified Profile message, length delimited. Does not implicitly {@link relay.Profile.verify|verify} messages.
         * @function encodeDelimited
         * @memberof relay.Profile
         * @static
         * @param {relay.IProfile} message Profile message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Profile.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a Profile message from the specified reader or buffer.
         * @function decode
         * @memberof relay.Profile
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {relay.Profile} Profile
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Profile.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.relay.Profile();
            while (reader.pos < end) {
                var tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.timestamp = reader.int64();
                        break;
                    }
                case 2: {
                        message.ttl = reader.int64();
                        break;
                    }
                case 3: {
                        if (!(message.entries && message.entries.length))
                            message.entries = [];
                        message.entries.push($root.relay.ProfileEntry.decode(reader, reader.uint32()));
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a Profile message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof relay.Profile
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {relay.Profile} Profile
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Profile.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a Profile message.
         * @function verify
         * @memberof relay.Profile
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        Profile.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.timestamp != null && message.hasOwnProperty("timestamp"))
                if (!$util.isInteger(message.timestamp) && !(message.timestamp && $util.isInteger(message.timestamp.low) && $util.isInteger(message.timestamp.high)))
                    return "timestamp: integer|Long expected";
            if (message.ttl != null && message.hasOwnProperty("ttl"))
                if (!$util.isInteger(message.ttl) && !(message.ttl && $util.isInteger(message.ttl.low) && $util.isInteger(message.ttl.high)))
                    return "ttl: integer|Long expected";
            if (message.entries != null && message.hasOwnProperty("entries")) {
                if (!Array.isArray(message.entries))
                    return "entries: array expected";
                for (var i = 0; i < message.entries.length; ++i) {
                    var error = $root.relay.ProfileEntry.verify(message.entries[i]);
                    if (error)
                        return "entries." + error;
                }
            }
            return null;
        };

        /**
         * Creates a Profile message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof relay.Profile
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {relay.Profile} Profile
         */
        Profile.fromObject = function fromObject(object) {
            if (object instanceof $root.relay.Profile)
                return object;
            var message = new $root.relay.Profile();
            if (object.timestamp != null)
                if ($util.Long)
                    (message.timestamp = $util.Long.fromValue(object.timestamp)).unsigned = false;
                else if (typeof object.timestamp === "string")
                    message.timestamp = parseInt(object.timestamp, 10);
                else if (typeof object.timestamp === "number")
                    message.timestamp = object.timestamp;
                else if (typeof object.timestamp === "object")
                    message.timestamp = new $util.LongBits(object.timestamp.low >>> 0, object.timestamp.high >>> 0).toNumber();
            if (object.ttl != null)
                if ($util.Long)
                    (message.ttl = $util.Long.fromValue(object.ttl)).unsigned = false;
                else if (typeof object.ttl === "string")
                    message.ttl = parseInt(object.ttl, 10);
                else if (typeof object.ttl === "number")
                    message.ttl = object.ttl;
                else if (typeof object.ttl === "object")
                    message.ttl = new $util.LongBits(object.ttl.low >>> 0, object.ttl.high >>> 0).toNumber();
            if (object.entries) {
                if (!Array.isArray(object.entries))
                    throw TypeError(".relay.Profile.entries: array expected");
                message.entries = [];
                for (var i = 0; i < object.entries.length; ++i) {
                    if (typeof object.entries[i] !== "object")
                        throw TypeError(".relay.Profile.entries: object expected");
                    message.entries[i] = $root.relay.ProfileEntry.fromObject(object.entries[i]);
                }
            }
            return message;
        };

        /**
         * Creates a plain object from a Profile message. Also converts values to other types if specified.
         * @function toObject
         * @memberof relay.Profile
         * @static
         * @param {relay.Profile} message Profile
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        Profile.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.arrays || options.defaults)
                object.entries = [];
            if (options.defaults) {
                if ($util.Long) {
                    var long = new $util.Long(0, 0, false);
                    object.timestamp = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.timestamp = options.longs === String ? "0" : 0;
                if ($util.Long) {
                    var long = new $util.Long(0, 0, false);
                    object.ttl = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.ttl = options.longs === String ? "0" : 0;
            }
            if (message.timestamp != null && message.hasOwnProperty("timestamp"))
                if (typeof message.timestamp === "number")
                    object.timestamp = options.longs === String ? String(message.timestamp) : message.timestamp;
                else
                    object.timestamp = options.longs === String ? $util.Long.prototype.toString.call(message.timestamp) : options.longs === Number ? new $util.LongBits(message.timestamp.low >>> 0, message.timestamp.high >>> 0).toNumber() : message.timestamp;
            if (message.ttl != null && message.hasOwnProperty("ttl"))
                if (typeof message.ttl === "number")
                    object.ttl = options.longs === String ? String(message.ttl) : message.ttl;
                else
                    object.ttl = options.longs === String ? $util.Long.prototype.toString.call(message.ttl) : options.longs === Number ? new $util.LongBits(message.ttl.low >>> 0, message.ttl.high >>> 0).toNumber() : message.ttl;
            if (message.entries && message.entries.length) {
                object.entries = [];
                for (var j = 0; j < message.entries.length; ++j)
                    object.entries[j] = $root.relay.ProfileEntry.toObject(message.entries[j], options);
            }
            return object;
        };

        /**
         * Converts this Profile to JSON.
         * @function toJSON
         * @memberof relay.Profile
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        Profile.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for Profile
         * @function getTypeUrl
         * @memberof relay.Profile
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        Profile.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/relay.Profile";
        };

        return Profile;
    })();

    relay.PayloadEntry = (function() {

        /**
         * Properties of a PayloadEntry.
         * @memberof relay
         * @interface IPayloadEntry
         * @property {string|null} [kind] PayloadEntry kind
         * @property {Array.<relay.IHeader>|null} [headers] PayloadEntry headers
         * @property {Uint8Array|null} [body] PayloadEntry body
         */

        /**
         * Constructs a new PayloadEntry.
         * @memberof relay
         * @classdesc Represents a PayloadEntry.
         * @implements IPayloadEntry
         * @constructor
         * @param {relay.IPayloadEntry=} [properties] Properties to set
         */
        function PayloadEntry(properties) {
            this.headers = [];
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * PayloadEntry kind.
         * @member {string} kind
         * @memberof relay.PayloadEntry
         * @instance
         */
        PayloadEntry.prototype.kind = "";

        /**
         * PayloadEntry headers.
         * @member {Array.<relay.IHeader>} headers
         * @memberof relay.PayloadEntry
         * @instance
         */
        PayloadEntry.prototype.headers = $util.emptyArray;

        /**
         * PayloadEntry body.
         * @member {Uint8Array} body
         * @memberof relay.PayloadEntry
         * @instance
         */
        PayloadEntry.prototype.body = $util.newBuffer([]);

        /**
         * Creates a new PayloadEntry instance using the specified properties.
         * @function create
         * @memberof relay.PayloadEntry
         * @static
         * @param {relay.IPayloadEntry=} [properties] Properties to set
         * @returns {relay.PayloadEntry} PayloadEntry instance
         */
        PayloadEntry.create = function create(properties) {
            return new PayloadEntry(properties);
        };

        /**
         * Encodes the specified PayloadEntry message. Does not implicitly {@link relay.PayloadEntry.verify|verify} messages.
         * @function encode
         * @memberof relay.PayloadEntry
         * @static
         * @param {relay.IPayloadEntry} message PayloadEntry message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PayloadEntry.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.kind != null && Object.hasOwnProperty.call(message, "kind"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.kind);
            if (message.headers != null && message.headers.length)
                for (var i = 0; i < message.headers.length; ++i)
                    $root.relay.Header.encode(message.headers[i], writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
            if (message.body != null && Object.hasOwnProperty.call(message, "body"))
                writer.uint32(/* id 3, wireType 2 =*/26).bytes(message.body);
            return writer;
        };

        /**
         * Encodes the specified PayloadEntry message, length delimited. Does not implicitly {@link relay.PayloadEntry.verify|verify} messages.
         * @function encodeDelimited
         * @memberof relay.PayloadEntry
         * @static
         * @param {relay.IPayloadEntry} message PayloadEntry message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PayloadEntry.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a PayloadEntry message from the specified reader or buffer.
         * @function decode
         * @memberof relay.PayloadEntry
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {relay.PayloadEntry} PayloadEntry
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PayloadEntry.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.relay.PayloadEntry();
            while (reader.pos < end) {
                var tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.kind = reader.string();
                        break;
                    }
                case 2: {
                        if (!(message.headers && message.headers.length))
                            message.headers = [];
                        message.headers.push($root.relay.Header.decode(reader, reader.uint32()));
                        break;
                    }
                case 3: {
                        message.body = reader.bytes();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a PayloadEntry message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof relay.PayloadEntry
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {relay.PayloadEntry} PayloadEntry
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PayloadEntry.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a PayloadEntry message.
         * @function verify
         * @memberof relay.PayloadEntry
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        PayloadEntry.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.kind != null && message.hasOwnProperty("kind"))
                if (!$util.isString(message.kind))
                    return "kind: string expected";
            if (message.headers != null && message.hasOwnProperty("headers")) {
                if (!Array.isArray(message.headers))
                    return "headers: array expected";
                for (var i = 0; i < message.headers.length; ++i) {
                    var error = $root.relay.Header.verify(message.headers[i]);
                    if (error)
                        return "headers." + error;
                }
            }
            if (message.body != null && message.hasOwnProperty("body"))
                if (!(message.body && typeof message.body.length === "number" || $util.isString(message.body)))
                    return "body: buffer expected";
            return null;
        };

        /**
         * Creates a PayloadEntry message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof relay.PayloadEntry
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {relay.PayloadEntry} PayloadEntry
         */
        PayloadEntry.fromObject = function fromObject(object) {
            if (object instanceof $root.relay.PayloadEntry)
                return object;
            var message = new $root.relay.PayloadEntry();
            if (object.kind != null)
                message.kind = String(object.kind);
            if (object.headers) {
                if (!Array.isArray(object.headers))
                    throw TypeError(".relay.PayloadEntry.headers: array expected");
                message.headers = [];
                for (var i = 0; i < object.headers.length; ++i) {
                    if (typeof object.headers[i] !== "object")
                        throw TypeError(".relay.PayloadEntry.headers: object expected");
                    message.headers[i] = $root.relay.Header.fromObject(object.headers[i]);
                }
            }
            if (object.body != null)
                if (typeof object.body === "string")
                    $util.base64.decode(object.body, message.body = $util.newBuffer($util.base64.length(object.body)), 0);
                else if (object.body.length >= 0)
                    message.body = object.body;
            return message;
        };

        /**
         * Creates a plain object from a PayloadEntry message. Also converts values to other types if specified.
         * @function toObject
         * @memberof relay.PayloadEntry
         * @static
         * @param {relay.PayloadEntry} message PayloadEntry
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        PayloadEntry.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.arrays || options.defaults)
                object.headers = [];
            if (options.defaults) {
                object.kind = "";
                if (options.bytes === String)
                    object.body = "";
                else {
                    object.body = [];
                    if (options.bytes !== Array)
                        object.body = $util.newBuffer(object.body);
                }
            }
            if (message.kind != null && message.hasOwnProperty("kind"))
                object.kind = message.kind;
            if (message.headers && message.headers.length) {
                object.headers = [];
                for (var j = 0; j < message.headers.length; ++j)
                    object.headers[j] = $root.relay.Header.toObject(message.headers[j], options);
            }
            if (message.body != null && message.hasOwnProperty("body"))
                object.body = options.bytes === String ? $util.base64.encode(message.body, 0, message.body.length) : options.bytes === Array ? Array.prototype.slice.call(message.body) : message.body;
            return object;
        };

        /**
         * Converts this PayloadEntry to JSON.
         * @function toJSON
         * @memberof relay.PayloadEntry
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        PayloadEntry.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for PayloadEntry
         * @function getTypeUrl
         * @memberof relay.PayloadEntry
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        PayloadEntry.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/relay.PayloadEntry";
        };

        return PayloadEntry;
    })();

    relay.Payload = (function() {

        /**
         * Properties of a Payload.
         * @memberof relay
         * @interface IPayload
         * @property {number|Long|null} [timestamp] Payload timestamp
         * @property {Array.<relay.IPayloadEntry>|null} [entries] Payload entries
         */

        /**
         * Constructs a new Payload.
         * @memberof relay
         * @classdesc Represents a Payload.
         * @implements IPayload
         * @constructor
         * @param {relay.IPayload=} [properties] Properties to set
         */
        function Payload(properties) {
            this.entries = [];
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Payload timestamp.
         * @member {number|Long} timestamp
         * @memberof relay.Payload
         * @instance
         */
        Payload.prototype.timestamp = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * Payload entries.
         * @member {Array.<relay.IPayloadEntry>} entries
         * @memberof relay.Payload
         * @instance
         */
        Payload.prototype.entries = $util.emptyArray;

        /**
         * Creates a new Payload instance using the specified properties.
         * @function create
         * @memberof relay.Payload
         * @static
         * @param {relay.IPayload=} [properties] Properties to set
         * @returns {relay.Payload} Payload instance
         */
        Payload.create = function create(properties) {
            return new Payload(properties);
        };

        /**
         * Encodes the specified Payload message. Does not implicitly {@link relay.Payload.verify|verify} messages.
         * @function encode
         * @memberof relay.Payload
         * @static
         * @param {relay.IPayload} message Payload message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Payload.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.timestamp != null && Object.hasOwnProperty.call(message, "timestamp"))
                writer.uint32(/* id 1, wireType 0 =*/8).int64(message.timestamp);
            if (message.entries != null && message.entries.length)
                for (var i = 0; i < message.entries.length; ++i)
                    $root.relay.PayloadEntry.encode(message.entries[i], writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified Payload message, length delimited. Does not implicitly {@link relay.Payload.verify|verify} messages.
         * @function encodeDelimited
         * @memberof relay.Payload
         * @static
         * @param {relay.IPayload} message Payload message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Payload.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a Payload message from the specified reader or buffer.
         * @function decode
         * @memberof relay.Payload
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {relay.Payload} Payload
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Payload.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.relay.Payload();
            while (reader.pos < end) {
                var tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.timestamp = reader.int64();
                        break;
                    }
                case 2: {
                        if (!(message.entries && message.entries.length))
                            message.entries = [];
                        message.entries.push($root.relay.PayloadEntry.decode(reader, reader.uint32()));
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a Payload message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof relay.Payload
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {relay.Payload} Payload
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Payload.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a Payload message.
         * @function verify
         * @memberof relay.Payload
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        Payload.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.timestamp != null && message.hasOwnProperty("timestamp"))
                if (!$util.isInteger(message.timestamp) && !(message.timestamp && $util.isInteger(message.timestamp.low) && $util.isInteger(message.timestamp.high)))
                    return "timestamp: integer|Long expected";
            if (message.entries != null && message.hasOwnProperty("entries")) {
                if (!Array.isArray(message.entries))
                    return "entries: array expected";
                for (var i = 0; i < message.entries.length; ++i) {
                    var error = $root.relay.PayloadEntry.verify(message.entries[i]);
                    if (error)
                        return "entries." + error;
                }
            }
            return null;
        };

        /**
         * Creates a Payload message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof relay.Payload
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {relay.Payload} Payload
         */
        Payload.fromObject = function fromObject(object) {
            if (object instanceof $root.relay.Payload)
                return object;
            var message = new $root.relay.Payload();
            if (object.timestamp != null)
                if ($util.Long)
                    (message.timestamp = $util.Long.fromValue(object.timestamp)).unsigned = false;
                else if (typeof object.timestamp === "string")
                    message.timestamp = parseInt(object.timestamp, 10);
                else if (typeof object.timestamp === "number")
                    message.timestamp = object.timestamp;
                else if (typeof object.timestamp === "object")
                    message.timestamp = new $util.LongBits(object.timestamp.low >>> 0, object.timestamp.high >>> 0).toNumber();
            if (object.entries) {
                if (!Array.isArray(object.entries))
                    throw TypeError(".relay.Payload.entries: array expected");
                message.entries = [];
                for (var i = 0; i < object.entries.length; ++i) {
                    if (typeof object.entries[i] !== "object")
                        throw TypeError(".relay.Payload.entries: object expected");
                    message.entries[i] = $root.relay.PayloadEntry.fromObject(object.entries[i]);
                }
            }
            return message;
        };

        /**
         * Creates a plain object from a Payload message. Also converts values to other types if specified.
         * @function toObject
         * @memberof relay.Payload
         * @static
         * @param {relay.Payload} message Payload
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        Payload.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.arrays || options.defaults)
                object.entries = [];
            if (options.defaults)
                if ($util.Long) {
                    var long = new $util.Long(0, 0, false);
                    object.timestamp = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.timestamp = options.longs === String ? "0" : 0;
            if (message.timestamp != null && message.hasOwnProperty("timestamp"))
                if (typeof message.timestamp === "number")
                    object.timestamp = options.longs === String ? String(message.timestamp) : message.timestamp;
                else
                    object.timestamp = options.longs === String ? $util.Long.prototype.toString.call(message.timestamp) : options.longs === Number ? new $util.LongBits(message.timestamp.low >>> 0, message.timestamp.high >>> 0).toNumber() : message.timestamp;
            if (message.entries && message.entries.length) {
                object.entries = [];
                for (var j = 0; j < message.entries.length; ++j)
                    object.entries[j] = $root.relay.PayloadEntry.toObject(message.entries[j], options);
            }
            return object;
        };

        /**
         * Converts this Payload to JSON.
         * @function toJSON
         * @memberof relay.Payload
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        Payload.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for Payload
         * @function getTypeUrl
         * @memberof relay.Payload
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        Payload.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/relay.Payload";
        };

        return Payload;
    })();

    relay.StampOutpoints = (function() {

        /**
         * Properties of a StampOutpoints.
         * @memberof relay
         * @interface IStampOutpoints
         * @property {Uint8Array|null} [stampTx] StampOutpoints stampTx
         * @property {Array.<number>|null} [vouts] StampOutpoints vouts
         */

        /**
         * Constructs a new StampOutpoints.
         * @memberof relay
         * @classdesc Represents a StampOutpoints.
         * @implements IStampOutpoints
         * @constructor
         * @param {relay.IStampOutpoints=} [properties] Properties to set
         */
        function StampOutpoints(properties) {
            this.vouts = [];
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * StampOutpoints stampTx.
         * @member {Uint8Array} stampTx
         * @memberof relay.StampOutpoints
         * @instance
         */
        StampOutpoints.prototype.stampTx = $util.newBuffer([]);

        /**
         * StampOutpoints vouts.
         * @member {Array.<number>} vouts
         * @memberof relay.StampOutpoints
         * @instance
         */
        StampOutpoints.prototype.vouts = $util.emptyArray;

        /**
         * Creates a new StampOutpoints instance using the specified properties.
         * @function create
         * @memberof relay.StampOutpoints
         * @static
         * @param {relay.IStampOutpoints=} [properties] Properties to set
         * @returns {relay.StampOutpoints} StampOutpoints instance
         */
        StampOutpoints.create = function create(properties) {
            return new StampOutpoints(properties);
        };

        /**
         * Encodes the specified StampOutpoints message. Does not implicitly {@link relay.StampOutpoints.verify|verify} messages.
         * @function encode
         * @memberof relay.StampOutpoints
         * @static
         * @param {relay.IStampOutpoints} message StampOutpoints message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        StampOutpoints.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.stampTx != null && Object.hasOwnProperty.call(message, "stampTx"))
                writer.uint32(/* id 1, wireType 2 =*/10).bytes(message.stampTx);
            if (message.vouts != null && message.vouts.length) {
                writer.uint32(/* id 2, wireType 2 =*/18).fork();
                for (var i = 0; i < message.vouts.length; ++i)
                    writer.uint32(message.vouts[i]);
                writer.ldelim();
            }
            return writer;
        };

        /**
         * Encodes the specified StampOutpoints message, length delimited. Does not implicitly {@link relay.StampOutpoints.verify|verify} messages.
         * @function encodeDelimited
         * @memberof relay.StampOutpoints
         * @static
         * @param {relay.IStampOutpoints} message StampOutpoints message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        StampOutpoints.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a StampOutpoints message from the specified reader or buffer.
         * @function decode
         * @memberof relay.StampOutpoints
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {relay.StampOutpoints} StampOutpoints
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        StampOutpoints.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.relay.StampOutpoints();
            while (reader.pos < end) {
                var tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.stampTx = reader.bytes();
                        break;
                    }
                case 2: {
                        if (!(message.vouts && message.vouts.length))
                            message.vouts = [];
                        if ((tag & 7) === 2) {
                            var end2 = reader.uint32() + reader.pos;
                            while (reader.pos < end2)
                                message.vouts.push(reader.uint32());
                        } else
                            message.vouts.push(reader.uint32());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a StampOutpoints message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof relay.StampOutpoints
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {relay.StampOutpoints} StampOutpoints
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        StampOutpoints.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a StampOutpoints message.
         * @function verify
         * @memberof relay.StampOutpoints
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        StampOutpoints.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.stampTx != null && message.hasOwnProperty("stampTx"))
                if (!(message.stampTx && typeof message.stampTx.length === "number" || $util.isString(message.stampTx)))
                    return "stampTx: buffer expected";
            if (message.vouts != null && message.hasOwnProperty("vouts")) {
                if (!Array.isArray(message.vouts))
                    return "vouts: array expected";
                for (var i = 0; i < message.vouts.length; ++i)
                    if (!$util.isInteger(message.vouts[i]))
                        return "vouts: integer[] expected";
            }
            return null;
        };

        /**
         * Creates a StampOutpoints message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof relay.StampOutpoints
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {relay.StampOutpoints} StampOutpoints
         */
        StampOutpoints.fromObject = function fromObject(object) {
            if (object instanceof $root.relay.StampOutpoints)
                return object;
            var message = new $root.relay.StampOutpoints();
            if (object.stampTx != null)
                if (typeof object.stampTx === "string")
                    $util.base64.decode(object.stampTx, message.stampTx = $util.newBuffer($util.base64.length(object.stampTx)), 0);
                else if (object.stampTx.length >= 0)
                    message.stampTx = object.stampTx;
            if (object.vouts) {
                if (!Array.isArray(object.vouts))
                    throw TypeError(".relay.StampOutpoints.vouts: array expected");
                message.vouts = [];
                for (var i = 0; i < object.vouts.length; ++i)
                    message.vouts[i] = object.vouts[i] >>> 0;
            }
            return message;
        };

        /**
         * Creates a plain object from a StampOutpoints message. Also converts values to other types if specified.
         * @function toObject
         * @memberof relay.StampOutpoints
         * @static
         * @param {relay.StampOutpoints} message StampOutpoints
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        StampOutpoints.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.arrays || options.defaults)
                object.vouts = [];
            if (options.defaults)
                if (options.bytes === String)
                    object.stampTx = "";
                else {
                    object.stampTx = [];
                    if (options.bytes !== Array)
                        object.stampTx = $util.newBuffer(object.stampTx);
                }
            if (message.stampTx != null && message.hasOwnProperty("stampTx"))
                object.stampTx = options.bytes === String ? $util.base64.encode(message.stampTx, 0, message.stampTx.length) : options.bytes === Array ? Array.prototype.slice.call(message.stampTx) : message.stampTx;
            if (message.vouts && message.vouts.length) {
                object.vouts = [];
                for (var j = 0; j < message.vouts.length; ++j)
                    object.vouts[j] = message.vouts[j];
            }
            return object;
        };

        /**
         * Converts this StampOutpoints to JSON.
         * @function toJSON
         * @memberof relay.StampOutpoints
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        StampOutpoints.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for StampOutpoints
         * @function getTypeUrl
         * @memberof relay.StampOutpoints
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        StampOutpoints.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/relay.StampOutpoints";
        };

        return StampOutpoints;
    })();

    relay.Stamp = (function() {

        /**
         * Properties of a Stamp.
         * @memberof relay
         * @interface IStamp
         * @property {relay.Stamp.StampType|null} [stampType] Stamp stampType
         * @property {Array.<relay.IStampOutpoints>|null} [stampOutpoints] Stamp stampOutpoints
         */

        /**
         * Constructs a new Stamp.
         * @memberof relay
         * @classdesc Represents a Stamp.
         * @implements IStamp
         * @constructor
         * @param {relay.IStamp=} [properties] Properties to set
         */
        function Stamp(properties) {
            this.stampOutpoints = [];
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Stamp stampType.
         * @member {relay.Stamp.StampType} stampType
         * @memberof relay.Stamp
         * @instance
         */
        Stamp.prototype.stampType = 0;

        /**
         * Stamp stampOutpoints.
         * @member {Array.<relay.IStampOutpoints>} stampOutpoints
         * @memberof relay.Stamp
         * @instance
         */
        Stamp.prototype.stampOutpoints = $util.emptyArray;

        /**
         * Creates a new Stamp instance using the specified properties.
         * @function create
         * @memberof relay.Stamp
         * @static
         * @param {relay.IStamp=} [properties] Properties to set
         * @returns {relay.Stamp} Stamp instance
         */
        Stamp.create = function create(properties) {
            return new Stamp(properties);
        };

        /**
         * Encodes the specified Stamp message. Does not implicitly {@link relay.Stamp.verify|verify} messages.
         * @function encode
         * @memberof relay.Stamp
         * @static
         * @param {relay.IStamp} message Stamp message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Stamp.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.stampType != null && Object.hasOwnProperty.call(message, "stampType"))
                writer.uint32(/* id 1, wireType 0 =*/8).int32(message.stampType);
            if (message.stampOutpoints != null && message.stampOutpoints.length)
                for (var i = 0; i < message.stampOutpoints.length; ++i)
                    $root.relay.StampOutpoints.encode(message.stampOutpoints[i], writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified Stamp message, length delimited. Does not implicitly {@link relay.Stamp.verify|verify} messages.
         * @function encodeDelimited
         * @memberof relay.Stamp
         * @static
         * @param {relay.IStamp} message Stamp message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Stamp.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a Stamp message from the specified reader or buffer.
         * @function decode
         * @memberof relay.Stamp
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {relay.Stamp} Stamp
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Stamp.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.relay.Stamp();
            while (reader.pos < end) {
                var tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.stampType = reader.int32();
                        break;
                    }
                case 2: {
                        if (!(message.stampOutpoints && message.stampOutpoints.length))
                            message.stampOutpoints = [];
                        message.stampOutpoints.push($root.relay.StampOutpoints.decode(reader, reader.uint32()));
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a Stamp message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof relay.Stamp
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {relay.Stamp} Stamp
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Stamp.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a Stamp message.
         * @function verify
         * @memberof relay.Stamp
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        Stamp.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.stampType != null && message.hasOwnProperty("stampType"))
                switch (message.stampType) {
                default:
                    return "stampType: enum value expected";
                case 0:
                case 1:
                    break;
                }
            if (message.stampOutpoints != null && message.hasOwnProperty("stampOutpoints")) {
                if (!Array.isArray(message.stampOutpoints))
                    return "stampOutpoints: array expected";
                for (var i = 0; i < message.stampOutpoints.length; ++i) {
                    var error = $root.relay.StampOutpoints.verify(message.stampOutpoints[i]);
                    if (error)
                        return "stampOutpoints." + error;
                }
            }
            return null;
        };

        /**
         * Creates a Stamp message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof relay.Stamp
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {relay.Stamp} Stamp
         */
        Stamp.fromObject = function fromObject(object) {
            if (object instanceof $root.relay.Stamp)
                return object;
            var message = new $root.relay.Stamp();
            switch (object.stampType) {
            default:
                if (typeof object.stampType === "number") {
                    message.stampType = object.stampType;
                    break;
                }
                break;
            case "None":
            case 0:
                message.stampType = 0;
                break;
            case "MessageCommitment":
            case 1:
                message.stampType = 1;
                break;
            }
            if (object.stampOutpoints) {
                if (!Array.isArray(object.stampOutpoints))
                    throw TypeError(".relay.Stamp.stampOutpoints: array expected");
                message.stampOutpoints = [];
                for (var i = 0; i < object.stampOutpoints.length; ++i) {
                    if (typeof object.stampOutpoints[i] !== "object")
                        throw TypeError(".relay.Stamp.stampOutpoints: object expected");
                    message.stampOutpoints[i] = $root.relay.StampOutpoints.fromObject(object.stampOutpoints[i]);
                }
            }
            return message;
        };

        /**
         * Creates a plain object from a Stamp message. Also converts values to other types if specified.
         * @function toObject
         * @memberof relay.Stamp
         * @static
         * @param {relay.Stamp} message Stamp
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        Stamp.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.arrays || options.defaults)
                object.stampOutpoints = [];
            if (options.defaults)
                object.stampType = options.enums === String ? "None" : 0;
            if (message.stampType != null && message.hasOwnProperty("stampType"))
                object.stampType = options.enums === String ? $root.relay.Stamp.StampType[message.stampType] === undefined ? message.stampType : $root.relay.Stamp.StampType[message.stampType] : message.stampType;
            if (message.stampOutpoints && message.stampOutpoints.length) {
                object.stampOutpoints = [];
                for (var j = 0; j < message.stampOutpoints.length; ++j)
                    object.stampOutpoints[j] = $root.relay.StampOutpoints.toObject(message.stampOutpoints[j], options);
            }
            return object;
        };

        /**
         * Converts this Stamp to JSON.
         * @function toJSON
         * @memberof relay.Stamp
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        Stamp.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for Stamp
         * @function getTypeUrl
         * @memberof relay.Stamp
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        Stamp.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/relay.Stamp";
        };

        /**
         * StampType enum.
         * @name relay.Stamp.StampType
         * @enum {number}
         * @property {number} None=0 None value
         * @property {number} MessageCommitment=1 MessageCommitment value
         */
        Stamp.StampType = (function() {
            var valuesById = {}, values = Object.create(valuesById);
            values[valuesById[0] = "None"] = 0;
            values[valuesById[1] = "MessageCommitment"] = 1;
            return values;
        })();

        return Stamp;
    })();

    relay.Message = (function() {

        /**
         * Properties of a Message.
         * @memberof relay
         * @interface IMessage
         * @property {Uint8Array|null} [sourcePublicKey] Message sourcePublicKey
         * @property {Uint8Array|null} [destinationPublicKey] Message destinationPublicKey
         * @property {number|Long|null} [receivedTime] Message receivedTime
         * @property {Uint8Array|null} [payloadDigest] Message payloadDigest
         * @property {relay.IStamp|null} [stamp] Message stamp
         * @property {relay.Message.EncryptionScheme|null} [scheme] Message scheme
         * @property {Uint8Array|null} [salt] Message salt
         * @property {Uint8Array|null} [payloadHmac] Message payloadHmac
         * @property {number|Long|null} [payloadSize] Message payloadSize
         * @property {Uint8Array|null} [payload] Message payload
         */

        /**
         * Constructs a new Message.
         * @memberof relay
         * @classdesc Represents a Message.
         * @implements IMessage
         * @constructor
         * @param {relay.IMessage=} [properties] Properties to set
         */
        function Message(properties) {
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Message sourcePublicKey.
         * @member {Uint8Array} sourcePublicKey
         * @memberof relay.Message
         * @instance
         */
        Message.prototype.sourcePublicKey = $util.newBuffer([]);

        /**
         * Message destinationPublicKey.
         * @member {Uint8Array} destinationPublicKey
         * @memberof relay.Message
         * @instance
         */
        Message.prototype.destinationPublicKey = $util.newBuffer([]);

        /**
         * Message receivedTime.
         * @member {number|Long} receivedTime
         * @memberof relay.Message
         * @instance
         */
        Message.prototype.receivedTime = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * Message payloadDigest.
         * @member {Uint8Array} payloadDigest
         * @memberof relay.Message
         * @instance
         */
        Message.prototype.payloadDigest = $util.newBuffer([]);

        /**
         * Message stamp.
         * @member {relay.IStamp|null|undefined} stamp
         * @memberof relay.Message
         * @instance
         */
        Message.prototype.stamp = null;

        /**
         * Message scheme.
         * @member {relay.Message.EncryptionScheme} scheme
         * @memberof relay.Message
         * @instance
         */
        Message.prototype.scheme = 0;

        /**
         * Message salt.
         * @member {Uint8Array} salt
         * @memberof relay.Message
         * @instance
         */
        Message.prototype.salt = $util.newBuffer([]);

        /**
         * Message payloadHmac.
         * @member {Uint8Array} payloadHmac
         * @memberof relay.Message
         * @instance
         */
        Message.prototype.payloadHmac = $util.newBuffer([]);

        /**
         * Message payloadSize.
         * @member {number|Long} payloadSize
         * @memberof relay.Message
         * @instance
         */
        Message.prototype.payloadSize = $util.Long ? $util.Long.fromBits(0,0,true) : 0;

        /**
         * Message payload.
         * @member {Uint8Array} payload
         * @memberof relay.Message
         * @instance
         */
        Message.prototype.payload = $util.newBuffer([]);

        /**
         * Creates a new Message instance using the specified properties.
         * @function create
         * @memberof relay.Message
         * @static
         * @param {relay.IMessage=} [properties] Properties to set
         * @returns {relay.Message} Message instance
         */
        Message.create = function create(properties) {
            return new Message(properties);
        };

        /**
         * Encodes the specified Message message. Does not implicitly {@link relay.Message.verify|verify} messages.
         * @function encode
         * @memberof relay.Message
         * @static
         * @param {relay.IMessage} message Message message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Message.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.sourcePublicKey != null && Object.hasOwnProperty.call(message, "sourcePublicKey"))
                writer.uint32(/* id 1, wireType 2 =*/10).bytes(message.sourcePublicKey);
            if (message.destinationPublicKey != null && Object.hasOwnProperty.call(message, "destinationPublicKey"))
                writer.uint32(/* id 2, wireType 2 =*/18).bytes(message.destinationPublicKey);
            if (message.receivedTime != null && Object.hasOwnProperty.call(message, "receivedTime"))
                writer.uint32(/* id 3, wireType 0 =*/24).int64(message.receivedTime);
            if (message.payloadDigest != null && Object.hasOwnProperty.call(message, "payloadDigest"))
                writer.uint32(/* id 4, wireType 2 =*/34).bytes(message.payloadDigest);
            if (message.stamp != null && Object.hasOwnProperty.call(message, "stamp"))
                $root.relay.Stamp.encode(message.stamp, writer.uint32(/* id 5, wireType 2 =*/42).fork()).ldelim();
            if (message.scheme != null && Object.hasOwnProperty.call(message, "scheme"))
                writer.uint32(/* id 6, wireType 0 =*/48).int32(message.scheme);
            if (message.salt != null && Object.hasOwnProperty.call(message, "salt"))
                writer.uint32(/* id 7, wireType 2 =*/58).bytes(message.salt);
            if (message.payloadHmac != null && Object.hasOwnProperty.call(message, "payloadHmac"))
                writer.uint32(/* id 8, wireType 2 =*/66).bytes(message.payloadHmac);
            if (message.payloadSize != null && Object.hasOwnProperty.call(message, "payloadSize"))
                writer.uint32(/* id 9, wireType 0 =*/72).uint64(message.payloadSize);
            if (message.payload != null && Object.hasOwnProperty.call(message, "payload"))
                writer.uint32(/* id 100, wireType 2 =*/802).bytes(message.payload);
            return writer;
        };

        /**
         * Encodes the specified Message message, length delimited. Does not implicitly {@link relay.Message.verify|verify} messages.
         * @function encodeDelimited
         * @memberof relay.Message
         * @static
         * @param {relay.IMessage} message Message message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Message.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a Message message from the specified reader or buffer.
         * @function decode
         * @memberof relay.Message
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {relay.Message} Message
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Message.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.relay.Message();
            while (reader.pos < end) {
                var tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.sourcePublicKey = reader.bytes();
                        break;
                    }
                case 2: {
                        message.destinationPublicKey = reader.bytes();
                        break;
                    }
                case 3: {
                        message.receivedTime = reader.int64();
                        break;
                    }
                case 4: {
                        message.payloadDigest = reader.bytes();
                        break;
                    }
                case 5: {
                        message.stamp = $root.relay.Stamp.decode(reader, reader.uint32());
                        break;
                    }
                case 6: {
                        message.scheme = reader.int32();
                        break;
                    }
                case 7: {
                        message.salt = reader.bytes();
                        break;
                    }
                case 8: {
                        message.payloadHmac = reader.bytes();
                        break;
                    }
                case 9: {
                        message.payloadSize = reader.uint64();
                        break;
                    }
                case 100: {
                        message.payload = reader.bytes();
                        break;
                    }
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
         * @memberof relay.Message
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {relay.Message} Message
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
         * @memberof relay.Message
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        Message.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.sourcePublicKey != null && message.hasOwnProperty("sourcePublicKey"))
                if (!(message.sourcePublicKey && typeof message.sourcePublicKey.length === "number" || $util.isString(message.sourcePublicKey)))
                    return "sourcePublicKey: buffer expected";
            if (message.destinationPublicKey != null && message.hasOwnProperty("destinationPublicKey"))
                if (!(message.destinationPublicKey && typeof message.destinationPublicKey.length === "number" || $util.isString(message.destinationPublicKey)))
                    return "destinationPublicKey: buffer expected";
            if (message.receivedTime != null && message.hasOwnProperty("receivedTime"))
                if (!$util.isInteger(message.receivedTime) && !(message.receivedTime && $util.isInteger(message.receivedTime.low) && $util.isInteger(message.receivedTime.high)))
                    return "receivedTime: integer|Long expected";
            if (message.payloadDigest != null && message.hasOwnProperty("payloadDigest"))
                if (!(message.payloadDigest && typeof message.payloadDigest.length === "number" || $util.isString(message.payloadDigest)))
                    return "payloadDigest: buffer expected";
            if (message.stamp != null && message.hasOwnProperty("stamp")) {
                var error = $root.relay.Stamp.verify(message.stamp);
                if (error)
                    return "stamp." + error;
            }
            if (message.scheme != null && message.hasOwnProperty("scheme"))
                switch (message.scheme) {
                default:
                    return "scheme: enum value expected";
                case 0:
                case 1:
                    break;
                }
            if (message.salt != null && message.hasOwnProperty("salt"))
                if (!(message.salt && typeof message.salt.length === "number" || $util.isString(message.salt)))
                    return "salt: buffer expected";
            if (message.payloadHmac != null && message.hasOwnProperty("payloadHmac"))
                if (!(message.payloadHmac && typeof message.payloadHmac.length === "number" || $util.isString(message.payloadHmac)))
                    return "payloadHmac: buffer expected";
            if (message.payloadSize != null && message.hasOwnProperty("payloadSize"))
                if (!$util.isInteger(message.payloadSize) && !(message.payloadSize && $util.isInteger(message.payloadSize.low) && $util.isInteger(message.payloadSize.high)))
                    return "payloadSize: integer|Long expected";
            if (message.payload != null && message.hasOwnProperty("payload"))
                if (!(message.payload && typeof message.payload.length === "number" || $util.isString(message.payload)))
                    return "payload: buffer expected";
            return null;
        };

        /**
         * Creates a Message message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof relay.Message
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {relay.Message} Message
         */
        Message.fromObject = function fromObject(object) {
            if (object instanceof $root.relay.Message)
                return object;
            var message = new $root.relay.Message();
            if (object.sourcePublicKey != null)
                if (typeof object.sourcePublicKey === "string")
                    $util.base64.decode(object.sourcePublicKey, message.sourcePublicKey = $util.newBuffer($util.base64.length(object.sourcePublicKey)), 0);
                else if (object.sourcePublicKey.length >= 0)
                    message.sourcePublicKey = object.sourcePublicKey;
            if (object.destinationPublicKey != null)
                if (typeof object.destinationPublicKey === "string")
                    $util.base64.decode(object.destinationPublicKey, message.destinationPublicKey = $util.newBuffer($util.base64.length(object.destinationPublicKey)), 0);
                else if (object.destinationPublicKey.length >= 0)
                    message.destinationPublicKey = object.destinationPublicKey;
            if (object.receivedTime != null)
                if ($util.Long)
                    (message.receivedTime = $util.Long.fromValue(object.receivedTime)).unsigned = false;
                else if (typeof object.receivedTime === "string")
                    message.receivedTime = parseInt(object.receivedTime, 10);
                else if (typeof object.receivedTime === "number")
                    message.receivedTime = object.receivedTime;
                else if (typeof object.receivedTime === "object")
                    message.receivedTime = new $util.LongBits(object.receivedTime.low >>> 0, object.receivedTime.high >>> 0).toNumber();
            if (object.payloadDigest != null)
                if (typeof object.payloadDigest === "string")
                    $util.base64.decode(object.payloadDigest, message.payloadDigest = $util.newBuffer($util.base64.length(object.payloadDigest)), 0);
                else if (object.payloadDigest.length >= 0)
                    message.payloadDigest = object.payloadDigest;
            if (object.stamp != null) {
                if (typeof object.stamp !== "object")
                    throw TypeError(".relay.Message.stamp: object expected");
                message.stamp = $root.relay.Stamp.fromObject(object.stamp);
            }
            switch (object.scheme) {
            default:
                if (typeof object.scheme === "number") {
                    message.scheme = object.scheme;
                    break;
                }
                break;
            case "None":
            case 0:
                message.scheme = 0;
                break;
            case "EphemeralDH":
            case 1:
                message.scheme = 1;
                break;
            }
            if (object.salt != null)
                if (typeof object.salt === "string")
                    $util.base64.decode(object.salt, message.salt = $util.newBuffer($util.base64.length(object.salt)), 0);
                else if (object.salt.length >= 0)
                    message.salt = object.salt;
            if (object.payloadHmac != null)
                if (typeof object.payloadHmac === "string")
                    $util.base64.decode(object.payloadHmac, message.payloadHmac = $util.newBuffer($util.base64.length(object.payloadHmac)), 0);
                else if (object.payloadHmac.length >= 0)
                    message.payloadHmac = object.payloadHmac;
            if (object.payloadSize != null)
                if ($util.Long)
                    (message.payloadSize = $util.Long.fromValue(object.payloadSize)).unsigned = true;
                else if (typeof object.payloadSize === "string")
                    message.payloadSize = parseInt(object.payloadSize, 10);
                else if (typeof object.payloadSize === "number")
                    message.payloadSize = object.payloadSize;
                else if (typeof object.payloadSize === "object")
                    message.payloadSize = new $util.LongBits(object.payloadSize.low >>> 0, object.payloadSize.high >>> 0).toNumber(true);
            if (object.payload != null)
                if (typeof object.payload === "string")
                    $util.base64.decode(object.payload, message.payload = $util.newBuffer($util.base64.length(object.payload)), 0);
                else if (object.payload.length >= 0)
                    message.payload = object.payload;
            return message;
        };

        /**
         * Creates a plain object from a Message message. Also converts values to other types if specified.
         * @function toObject
         * @memberof relay.Message
         * @static
         * @param {relay.Message} message Message
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        Message.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.defaults) {
                if (options.bytes === String)
                    object.sourcePublicKey = "";
                else {
                    object.sourcePublicKey = [];
                    if (options.bytes !== Array)
                        object.sourcePublicKey = $util.newBuffer(object.sourcePublicKey);
                }
                if (options.bytes === String)
                    object.destinationPublicKey = "";
                else {
                    object.destinationPublicKey = [];
                    if (options.bytes !== Array)
                        object.destinationPublicKey = $util.newBuffer(object.destinationPublicKey);
                }
                if ($util.Long) {
                    var long = new $util.Long(0, 0, false);
                    object.receivedTime = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.receivedTime = options.longs === String ? "0" : 0;
                if (options.bytes === String)
                    object.payloadDigest = "";
                else {
                    object.payloadDigest = [];
                    if (options.bytes !== Array)
                        object.payloadDigest = $util.newBuffer(object.payloadDigest);
                }
                object.stamp = null;
                object.scheme = options.enums === String ? "None" : 0;
                if (options.bytes === String)
                    object.salt = "";
                else {
                    object.salt = [];
                    if (options.bytes !== Array)
                        object.salt = $util.newBuffer(object.salt);
                }
                if (options.bytes === String)
                    object.payloadHmac = "";
                else {
                    object.payloadHmac = [];
                    if (options.bytes !== Array)
                        object.payloadHmac = $util.newBuffer(object.payloadHmac);
                }
                if ($util.Long) {
                    var long = new $util.Long(0, 0, true);
                    object.payloadSize = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.payloadSize = options.longs === String ? "0" : 0;
                if (options.bytes === String)
                    object.payload = "";
                else {
                    object.payload = [];
                    if (options.bytes !== Array)
                        object.payload = $util.newBuffer(object.payload);
                }
            }
            if (message.sourcePublicKey != null && message.hasOwnProperty("sourcePublicKey"))
                object.sourcePublicKey = options.bytes === String ? $util.base64.encode(message.sourcePublicKey, 0, message.sourcePublicKey.length) : options.bytes === Array ? Array.prototype.slice.call(message.sourcePublicKey) : message.sourcePublicKey;
            if (message.destinationPublicKey != null && message.hasOwnProperty("destinationPublicKey"))
                object.destinationPublicKey = options.bytes === String ? $util.base64.encode(message.destinationPublicKey, 0, message.destinationPublicKey.length) : options.bytes === Array ? Array.prototype.slice.call(message.destinationPublicKey) : message.destinationPublicKey;
            if (message.receivedTime != null && message.hasOwnProperty("receivedTime"))
                if (typeof message.receivedTime === "number")
                    object.receivedTime = options.longs === String ? String(message.receivedTime) : message.receivedTime;
                else
                    object.receivedTime = options.longs === String ? $util.Long.prototype.toString.call(message.receivedTime) : options.longs === Number ? new $util.LongBits(message.receivedTime.low >>> 0, message.receivedTime.high >>> 0).toNumber() : message.receivedTime;
            if (message.payloadDigest != null && message.hasOwnProperty("payloadDigest"))
                object.payloadDigest = options.bytes === String ? $util.base64.encode(message.payloadDigest, 0, message.payloadDigest.length) : options.bytes === Array ? Array.prototype.slice.call(message.payloadDigest) : message.payloadDigest;
            if (message.stamp != null && message.hasOwnProperty("stamp"))
                object.stamp = $root.relay.Stamp.toObject(message.stamp, options);
            if (message.scheme != null && message.hasOwnProperty("scheme"))
                object.scheme = options.enums === String ? $root.relay.Message.EncryptionScheme[message.scheme] === undefined ? message.scheme : $root.relay.Message.EncryptionScheme[message.scheme] : message.scheme;
            if (message.salt != null && message.hasOwnProperty("salt"))
                object.salt = options.bytes === String ? $util.base64.encode(message.salt, 0, message.salt.length) : options.bytes === Array ? Array.prototype.slice.call(message.salt) : message.salt;
            if (message.payloadHmac != null && message.hasOwnProperty("payloadHmac"))
                object.payloadHmac = options.bytes === String ? $util.base64.encode(message.payloadHmac, 0, message.payloadHmac.length) : options.bytes === Array ? Array.prototype.slice.call(message.payloadHmac) : message.payloadHmac;
            if (message.payloadSize != null && message.hasOwnProperty("payloadSize"))
                if (typeof message.payloadSize === "number")
                    object.payloadSize = options.longs === String ? String(message.payloadSize) : message.payloadSize;
                else
                    object.payloadSize = options.longs === String ? $util.Long.prototype.toString.call(message.payloadSize) : options.longs === Number ? new $util.LongBits(message.payloadSize.low >>> 0, message.payloadSize.high >>> 0).toNumber(true) : message.payloadSize;
            if (message.payload != null && message.hasOwnProperty("payload"))
                object.payload = options.bytes === String ? $util.base64.encode(message.payload, 0, message.payload.length) : options.bytes === Array ? Array.prototype.slice.call(message.payload) : message.payload;
            return object;
        };

        /**
         * Converts this Message to JSON.
         * @function toJSON
         * @memberof relay.Message
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        Message.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for Message
         * @function getTypeUrl
         * @memberof relay.Message
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        Message.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/relay.Message";
        };

        /**
         * EncryptionScheme enum.
         * @name relay.Message.EncryptionScheme
         * @enum {number}
         * @property {number} None=0 None value
         * @property {number} EphemeralDH=1 EphemeralDH value
         */
        Message.EncryptionScheme = (function() {
            var valuesById = {}, values = Object.create(valuesById);
            values[valuesById[0] = "None"] = 0;
            values[valuesById[1] = "EphemeralDH"] = 1;
            return values;
        })();

        return Message;
    })();

    relay.MessageSet = (function() {

        /**
         * Properties of a MessageSet.
         * @memberof relay
         * @interface IMessageSet
         * @property {Array.<relay.IMessage>|null} [messages] MessageSet messages
         */

        /**
         * Constructs a new MessageSet.
         * @memberof relay
         * @classdesc Represents a MessageSet.
         * @implements IMessageSet
         * @constructor
         * @param {relay.IMessageSet=} [properties] Properties to set
         */
        function MessageSet(properties) {
            this.messages = [];
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * MessageSet messages.
         * @member {Array.<relay.IMessage>} messages
         * @memberof relay.MessageSet
         * @instance
         */
        MessageSet.prototype.messages = $util.emptyArray;

        /**
         * Creates a new MessageSet instance using the specified properties.
         * @function create
         * @memberof relay.MessageSet
         * @static
         * @param {relay.IMessageSet=} [properties] Properties to set
         * @returns {relay.MessageSet} MessageSet instance
         */
        MessageSet.create = function create(properties) {
            return new MessageSet(properties);
        };

        /**
         * Encodes the specified MessageSet message. Does not implicitly {@link relay.MessageSet.verify|verify} messages.
         * @function encode
         * @memberof relay.MessageSet
         * @static
         * @param {relay.IMessageSet} message MessageSet message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        MessageSet.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.messages != null && message.messages.length)
                for (var i = 0; i < message.messages.length; ++i)
                    $root.relay.Message.encode(message.messages[i], writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified MessageSet message, length delimited. Does not implicitly {@link relay.MessageSet.verify|verify} messages.
         * @function encodeDelimited
         * @memberof relay.MessageSet
         * @static
         * @param {relay.IMessageSet} message MessageSet message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        MessageSet.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a MessageSet message from the specified reader or buffer.
         * @function decode
         * @memberof relay.MessageSet
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {relay.MessageSet} MessageSet
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        MessageSet.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.relay.MessageSet();
            while (reader.pos < end) {
                var tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        if (!(message.messages && message.messages.length))
                            message.messages = [];
                        message.messages.push($root.relay.Message.decode(reader, reader.uint32()));
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a MessageSet message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof relay.MessageSet
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {relay.MessageSet} MessageSet
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        MessageSet.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a MessageSet message.
         * @function verify
         * @memberof relay.MessageSet
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        MessageSet.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.messages != null && message.hasOwnProperty("messages")) {
                if (!Array.isArray(message.messages))
                    return "messages: array expected";
                for (var i = 0; i < message.messages.length; ++i) {
                    var error = $root.relay.Message.verify(message.messages[i]);
                    if (error)
                        return "messages." + error;
                }
            }
            return null;
        };

        /**
         * Creates a MessageSet message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof relay.MessageSet
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {relay.MessageSet} MessageSet
         */
        MessageSet.fromObject = function fromObject(object) {
            if (object instanceof $root.relay.MessageSet)
                return object;
            var message = new $root.relay.MessageSet();
            if (object.messages) {
                if (!Array.isArray(object.messages))
                    throw TypeError(".relay.MessageSet.messages: array expected");
                message.messages = [];
                for (var i = 0; i < object.messages.length; ++i) {
                    if (typeof object.messages[i] !== "object")
                        throw TypeError(".relay.MessageSet.messages: object expected");
                    message.messages[i] = $root.relay.Message.fromObject(object.messages[i]);
                }
            }
            return message;
        };

        /**
         * Creates a plain object from a MessageSet message. Also converts values to other types if specified.
         * @function toObject
         * @memberof relay.MessageSet
         * @static
         * @param {relay.MessageSet} message MessageSet
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        MessageSet.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.arrays || options.defaults)
                object.messages = [];
            if (message.messages && message.messages.length) {
                object.messages = [];
                for (var j = 0; j < message.messages.length; ++j)
                    object.messages[j] = $root.relay.Message.toObject(message.messages[j], options);
            }
            return object;
        };

        /**
         * Converts this MessageSet to JSON.
         * @function toJSON
         * @memberof relay.MessageSet
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        MessageSet.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for MessageSet
         * @function getTypeUrl
         * @memberof relay.MessageSet
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        MessageSet.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/relay.MessageSet";
        };

        return MessageSet;
    })();

    relay.PushError = (function() {

        /**
         * Properties of a PushError.
         * @memberof relay
         * @interface IPushError
         * @property {number|null} [statusCode] PushError statusCode
         * @property {string|null} [errorText] PushError errorText
         */

        /**
         * Constructs a new PushError.
         * @memberof relay
         * @classdesc Represents a PushError.
         * @implements IPushError
         * @constructor
         * @param {relay.IPushError=} [properties] Properties to set
         */
        function PushError(properties) {
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * PushError statusCode.
         * @member {number} statusCode
         * @memberof relay.PushError
         * @instance
         */
        PushError.prototype.statusCode = 0;

        /**
         * PushError errorText.
         * @member {string} errorText
         * @memberof relay.PushError
         * @instance
         */
        PushError.prototype.errorText = "";

        /**
         * Creates a new PushError instance using the specified properties.
         * @function create
         * @memberof relay.PushError
         * @static
         * @param {relay.IPushError=} [properties] Properties to set
         * @returns {relay.PushError} PushError instance
         */
        PushError.create = function create(properties) {
            return new PushError(properties);
        };

        /**
         * Encodes the specified PushError message. Does not implicitly {@link relay.PushError.verify|verify} messages.
         * @function encode
         * @memberof relay.PushError
         * @static
         * @param {relay.IPushError} message PushError message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PushError.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.statusCode != null && Object.hasOwnProperty.call(message, "statusCode"))
                writer.uint32(/* id 1, wireType 0 =*/8).uint32(message.statusCode);
            if (message.errorText != null && Object.hasOwnProperty.call(message, "errorText"))
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.errorText);
            return writer;
        };

        /**
         * Encodes the specified PushError message, length delimited. Does not implicitly {@link relay.PushError.verify|verify} messages.
         * @function encodeDelimited
         * @memberof relay.PushError
         * @static
         * @param {relay.IPushError} message PushError message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PushError.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a PushError message from the specified reader or buffer.
         * @function decode
         * @memberof relay.PushError
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {relay.PushError} PushError
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PushError.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.relay.PushError();
            while (reader.pos < end) {
                var tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.statusCode = reader.uint32();
                        break;
                    }
                case 2: {
                        message.errorText = reader.string();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a PushError message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof relay.PushError
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {relay.PushError} PushError
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PushError.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a PushError message.
         * @function verify
         * @memberof relay.PushError
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        PushError.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.statusCode != null && message.hasOwnProperty("statusCode"))
                if (!$util.isInteger(message.statusCode))
                    return "statusCode: integer expected";
            if (message.errorText != null && message.hasOwnProperty("errorText"))
                if (!$util.isString(message.errorText))
                    return "errorText: string expected";
            return null;
        };

        /**
         * Creates a PushError message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof relay.PushError
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {relay.PushError} PushError
         */
        PushError.fromObject = function fromObject(object) {
            if (object instanceof $root.relay.PushError)
                return object;
            var message = new $root.relay.PushError();
            if (object.statusCode != null)
                message.statusCode = object.statusCode >>> 0;
            if (object.errorText != null)
                message.errorText = String(object.errorText);
            return message;
        };

        /**
         * Creates a plain object from a PushError message. Also converts values to other types if specified.
         * @function toObject
         * @memberof relay.PushError
         * @static
         * @param {relay.PushError} message PushError
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        PushError.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.defaults) {
                object.statusCode = 0;
                object.errorText = "";
            }
            if (message.statusCode != null && message.hasOwnProperty("statusCode"))
                object.statusCode = message.statusCode;
            if (message.errorText != null && message.hasOwnProperty("errorText"))
                object.errorText = message.errorText;
            return object;
        };

        /**
         * Converts this PushError to JSON.
         * @function toJSON
         * @memberof relay.PushError
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        PushError.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for PushError
         * @function getTypeUrl
         * @memberof relay.PushError
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        PushError.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/relay.PushError";
        };

        return PushError;
    })();

    relay.PushErrors = (function() {

        /**
         * Properties of a PushErrors.
         * @memberof relay
         * @interface IPushErrors
         * @property {Object.<string,relay.IPushError>|null} [errors] PushErrors errors
         */

        /**
         * Constructs a new PushErrors.
         * @memberof relay
         * @classdesc Represents a PushErrors.
         * @implements IPushErrors
         * @constructor
         * @param {relay.IPushErrors=} [properties] Properties to set
         */
        function PushErrors(properties) {
            this.errors = {};
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * PushErrors errors.
         * @member {Object.<string,relay.IPushError>} errors
         * @memberof relay.PushErrors
         * @instance
         */
        PushErrors.prototype.errors = $util.emptyObject;

        /**
         * Creates a new PushErrors instance using the specified properties.
         * @function create
         * @memberof relay.PushErrors
         * @static
         * @param {relay.IPushErrors=} [properties] Properties to set
         * @returns {relay.PushErrors} PushErrors instance
         */
        PushErrors.create = function create(properties) {
            return new PushErrors(properties);
        };

        /**
         * Encodes the specified PushErrors message. Does not implicitly {@link relay.PushErrors.verify|verify} messages.
         * @function encode
         * @memberof relay.PushErrors
         * @static
         * @param {relay.IPushErrors} message PushErrors message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PushErrors.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.errors != null && Object.hasOwnProperty.call(message, "errors"))
                for (var keys = Object.keys(message.errors), i = 0; i < keys.length; ++i) {
                    writer.uint32(/* id 1, wireType 2 =*/10).fork().uint32(/* id 1, wireType 0 =*/8).int32(keys[i]);
                    $root.relay.PushError.encode(message.errors[keys[i]], writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim().ldelim();
                }
            return writer;
        };

        /**
         * Encodes the specified PushErrors message, length delimited. Does not implicitly {@link relay.PushErrors.verify|verify} messages.
         * @function encodeDelimited
         * @memberof relay.PushErrors
         * @static
         * @param {relay.IPushErrors} message PushErrors message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PushErrors.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a PushErrors message from the specified reader or buffer.
         * @function decode
         * @memberof relay.PushErrors
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {relay.PushErrors} PushErrors
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PushErrors.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.relay.PushErrors(), key, value;
            while (reader.pos < end) {
                var tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        if (message.errors === $util.emptyObject)
                            message.errors = {};
                        var end2 = reader.uint32() + reader.pos;
                        key = 0;
                        value = null;
                        while (reader.pos < end2) {
                            var tag2 = reader.uint32();
                            switch (tag2 >>> 3) {
                            case 1:
                                key = reader.int32();
                                break;
                            case 2:
                                value = $root.relay.PushError.decode(reader, reader.uint32());
                                break;
                            default:
                                reader.skipType(tag2 & 7);
                                break;
                            }
                        }
                        message.errors[key] = value;
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a PushErrors message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof relay.PushErrors
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {relay.PushErrors} PushErrors
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PushErrors.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a PushErrors message.
         * @function verify
         * @memberof relay.PushErrors
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        PushErrors.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.errors != null && message.hasOwnProperty("errors")) {
                if (!$util.isObject(message.errors))
                    return "errors: object expected";
                var key = Object.keys(message.errors);
                for (var i = 0; i < key.length; ++i) {
                    if (!$util.key32Re.test(key[i]))
                        return "errors: integer key{k:int32} expected";
                    {
                        var error = $root.relay.PushError.verify(message.errors[key[i]]);
                        if (error)
                            return "errors." + error;
                    }
                }
            }
            return null;
        };

        /**
         * Creates a PushErrors message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof relay.PushErrors
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {relay.PushErrors} PushErrors
         */
        PushErrors.fromObject = function fromObject(object) {
            if (object instanceof $root.relay.PushErrors)
                return object;
            var message = new $root.relay.PushErrors();
            if (object.errors) {
                if (typeof object.errors !== "object")
                    throw TypeError(".relay.PushErrors.errors: object expected");
                message.errors = {};
                for (var keys = Object.keys(object.errors), i = 0; i < keys.length; ++i) {
                    if (typeof object.errors[keys[i]] !== "object")
                        throw TypeError(".relay.PushErrors.errors: object expected");
                    message.errors[keys[i]] = $root.relay.PushError.fromObject(object.errors[keys[i]]);
                }
            }
            return message;
        };

        /**
         * Creates a plain object from a PushErrors message. Also converts values to other types if specified.
         * @function toObject
         * @memberof relay.PushErrors
         * @static
         * @param {relay.PushErrors} message PushErrors
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        PushErrors.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.objects || options.defaults)
                object.errors = {};
            var keys2;
            if (message.errors && (keys2 = Object.keys(message.errors)).length) {
                object.errors = {};
                for (var j = 0; j < keys2.length; ++j)
                    object.errors[keys2[j]] = $root.relay.PushError.toObject(message.errors[keys2[j]], options);
            }
            return object;
        };

        /**
         * Converts this PushErrors to JSON.
         * @function toJSON
         * @memberof relay.PushErrors
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        PushErrors.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for PushErrors
         * @function getTypeUrl
         * @memberof relay.PushErrors
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        PushErrors.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/relay.PushErrors";
        };

        return PushErrors;
    })();

    relay.MessagePage = (function() {

        /**
         * Properties of a MessagePage.
         * @memberof relay
         * @interface IMessagePage
         * @property {Array.<relay.IMessage>|null} [messages] MessagePage messages
         * @property {number|Long|null} [startTime] MessagePage startTime
         * @property {number|Long|null} [endTime] MessagePage endTime
         * @property {Uint8Array|null} [startDigest] MessagePage startDigest
         * @property {Uint8Array|null} [endDigest] MessagePage endDigest
         */

        /**
         * Constructs a new MessagePage.
         * @memberof relay
         * @classdesc Represents a MessagePage.
         * @implements IMessagePage
         * @constructor
         * @param {relay.IMessagePage=} [properties] Properties to set
         */
        function MessagePage(properties) {
            this.messages = [];
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * MessagePage messages.
         * @member {Array.<relay.IMessage>} messages
         * @memberof relay.MessagePage
         * @instance
         */
        MessagePage.prototype.messages = $util.emptyArray;

        /**
         * MessagePage startTime.
         * @member {number|Long} startTime
         * @memberof relay.MessagePage
         * @instance
         */
        MessagePage.prototype.startTime = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * MessagePage endTime.
         * @member {number|Long} endTime
         * @memberof relay.MessagePage
         * @instance
         */
        MessagePage.prototype.endTime = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * MessagePage startDigest.
         * @member {Uint8Array} startDigest
         * @memberof relay.MessagePage
         * @instance
         */
        MessagePage.prototype.startDigest = $util.newBuffer([]);

        /**
         * MessagePage endDigest.
         * @member {Uint8Array} endDigest
         * @memberof relay.MessagePage
         * @instance
         */
        MessagePage.prototype.endDigest = $util.newBuffer([]);

        /**
         * Creates a new MessagePage instance using the specified properties.
         * @function create
         * @memberof relay.MessagePage
         * @static
         * @param {relay.IMessagePage=} [properties] Properties to set
         * @returns {relay.MessagePage} MessagePage instance
         */
        MessagePage.create = function create(properties) {
            return new MessagePage(properties);
        };

        /**
         * Encodes the specified MessagePage message. Does not implicitly {@link relay.MessagePage.verify|verify} messages.
         * @function encode
         * @memberof relay.MessagePage
         * @static
         * @param {relay.IMessagePage} message MessagePage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        MessagePage.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.messages != null && message.messages.length)
                for (var i = 0; i < message.messages.length; ++i)
                    $root.relay.Message.encode(message.messages[i], writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            if (message.startTime != null && Object.hasOwnProperty.call(message, "startTime"))
                writer.uint32(/* id 2, wireType 0 =*/16).int64(message.startTime);
            if (message.endTime != null && Object.hasOwnProperty.call(message, "endTime"))
                writer.uint32(/* id 3, wireType 0 =*/24).int64(message.endTime);
            if (message.startDigest != null && Object.hasOwnProperty.call(message, "startDigest"))
                writer.uint32(/* id 4, wireType 2 =*/34).bytes(message.startDigest);
            if (message.endDigest != null && Object.hasOwnProperty.call(message, "endDigest"))
                writer.uint32(/* id 5, wireType 2 =*/42).bytes(message.endDigest);
            return writer;
        };

        /**
         * Encodes the specified MessagePage message, length delimited. Does not implicitly {@link relay.MessagePage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof relay.MessagePage
         * @static
         * @param {relay.IMessagePage} message MessagePage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        MessagePage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a MessagePage message from the specified reader or buffer.
         * @function decode
         * @memberof relay.MessagePage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {relay.MessagePage} MessagePage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        MessagePage.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.relay.MessagePage();
            while (reader.pos < end) {
                var tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        if (!(message.messages && message.messages.length))
                            message.messages = [];
                        message.messages.push($root.relay.Message.decode(reader, reader.uint32()));
                        break;
                    }
                case 2: {
                        message.startTime = reader.int64();
                        break;
                    }
                case 3: {
                        message.endTime = reader.int64();
                        break;
                    }
                case 4: {
                        message.startDigest = reader.bytes();
                        break;
                    }
                case 5: {
                        message.endDigest = reader.bytes();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a MessagePage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof relay.MessagePage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {relay.MessagePage} MessagePage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        MessagePage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a MessagePage message.
         * @function verify
         * @memberof relay.MessagePage
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        MessagePage.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.messages != null && message.hasOwnProperty("messages")) {
                if (!Array.isArray(message.messages))
                    return "messages: array expected";
                for (var i = 0; i < message.messages.length; ++i) {
                    var error = $root.relay.Message.verify(message.messages[i]);
                    if (error)
                        return "messages." + error;
                }
            }
            if (message.startTime != null && message.hasOwnProperty("startTime"))
                if (!$util.isInteger(message.startTime) && !(message.startTime && $util.isInteger(message.startTime.low) && $util.isInteger(message.startTime.high)))
                    return "startTime: integer|Long expected";
            if (message.endTime != null && message.hasOwnProperty("endTime"))
                if (!$util.isInteger(message.endTime) && !(message.endTime && $util.isInteger(message.endTime.low) && $util.isInteger(message.endTime.high)))
                    return "endTime: integer|Long expected";
            if (message.startDigest != null && message.hasOwnProperty("startDigest"))
                if (!(message.startDigest && typeof message.startDigest.length === "number" || $util.isString(message.startDigest)))
                    return "startDigest: buffer expected";
            if (message.endDigest != null && message.hasOwnProperty("endDigest"))
                if (!(message.endDigest && typeof message.endDigest.length === "number" || $util.isString(message.endDigest)))
                    return "endDigest: buffer expected";
            return null;
        };

        /**
         * Creates a MessagePage message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof relay.MessagePage
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {relay.MessagePage} MessagePage
         */
        MessagePage.fromObject = function fromObject(object) {
            if (object instanceof $root.relay.MessagePage)
                return object;
            var message = new $root.relay.MessagePage();
            if (object.messages) {
                if (!Array.isArray(object.messages))
                    throw TypeError(".relay.MessagePage.messages: array expected");
                message.messages = [];
                for (var i = 0; i < object.messages.length; ++i) {
                    if (typeof object.messages[i] !== "object")
                        throw TypeError(".relay.MessagePage.messages: object expected");
                    message.messages[i] = $root.relay.Message.fromObject(object.messages[i]);
                }
            }
            if (object.startTime != null)
                if ($util.Long)
                    (message.startTime = $util.Long.fromValue(object.startTime)).unsigned = false;
                else if (typeof object.startTime === "string")
                    message.startTime = parseInt(object.startTime, 10);
                else if (typeof object.startTime === "number")
                    message.startTime = object.startTime;
                else if (typeof object.startTime === "object")
                    message.startTime = new $util.LongBits(object.startTime.low >>> 0, object.startTime.high >>> 0).toNumber();
            if (object.endTime != null)
                if ($util.Long)
                    (message.endTime = $util.Long.fromValue(object.endTime)).unsigned = false;
                else if (typeof object.endTime === "string")
                    message.endTime = parseInt(object.endTime, 10);
                else if (typeof object.endTime === "number")
                    message.endTime = object.endTime;
                else if (typeof object.endTime === "object")
                    message.endTime = new $util.LongBits(object.endTime.low >>> 0, object.endTime.high >>> 0).toNumber();
            if (object.startDigest != null)
                if (typeof object.startDigest === "string")
                    $util.base64.decode(object.startDigest, message.startDigest = $util.newBuffer($util.base64.length(object.startDigest)), 0);
                else if (object.startDigest.length >= 0)
                    message.startDigest = object.startDigest;
            if (object.endDigest != null)
                if (typeof object.endDigest === "string")
                    $util.base64.decode(object.endDigest, message.endDigest = $util.newBuffer($util.base64.length(object.endDigest)), 0);
                else if (object.endDigest.length >= 0)
                    message.endDigest = object.endDigest;
            return message;
        };

        /**
         * Creates a plain object from a MessagePage message. Also converts values to other types if specified.
         * @function toObject
         * @memberof relay.MessagePage
         * @static
         * @param {relay.MessagePage} message MessagePage
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        MessagePage.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.arrays || options.defaults)
                object.messages = [];
            if (options.defaults) {
                if ($util.Long) {
                    var long = new $util.Long(0, 0, false);
                    object.startTime = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.startTime = options.longs === String ? "0" : 0;
                if ($util.Long) {
                    var long = new $util.Long(0, 0, false);
                    object.endTime = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.endTime = options.longs === String ? "0" : 0;
                if (options.bytes === String)
                    object.startDigest = "";
                else {
                    object.startDigest = [];
                    if (options.bytes !== Array)
                        object.startDigest = $util.newBuffer(object.startDigest);
                }
                if (options.bytes === String)
                    object.endDigest = "";
                else {
                    object.endDigest = [];
                    if (options.bytes !== Array)
                        object.endDigest = $util.newBuffer(object.endDigest);
                }
            }
            if (message.messages && message.messages.length) {
                object.messages = [];
                for (var j = 0; j < message.messages.length; ++j)
                    object.messages[j] = $root.relay.Message.toObject(message.messages[j], options);
            }
            if (message.startTime != null && message.hasOwnProperty("startTime"))
                if (typeof message.startTime === "number")
                    object.startTime = options.longs === String ? String(message.startTime) : message.startTime;
                else
                    object.startTime = options.longs === String ? $util.Long.prototype.toString.call(message.startTime) : options.longs === Number ? new $util.LongBits(message.startTime.low >>> 0, message.startTime.high >>> 0).toNumber() : message.startTime;
            if (message.endTime != null && message.hasOwnProperty("endTime"))
                if (typeof message.endTime === "number")
                    object.endTime = options.longs === String ? String(message.endTime) : message.endTime;
                else
                    object.endTime = options.longs === String ? $util.Long.prototype.toString.call(message.endTime) : options.longs === Number ? new $util.LongBits(message.endTime.low >>> 0, message.endTime.high >>> 0).toNumber() : message.endTime;
            if (message.startDigest != null && message.hasOwnProperty("startDigest"))
                object.startDigest = options.bytes === String ? $util.base64.encode(message.startDigest, 0, message.startDigest.length) : options.bytes === Array ? Array.prototype.slice.call(message.startDigest) : message.startDigest;
            if (message.endDigest != null && message.hasOwnProperty("endDigest"))
                object.endDigest = options.bytes === String ? $util.base64.encode(message.endDigest, 0, message.endDigest.length) : options.bytes === Array ? Array.prototype.slice.call(message.endDigest) : message.endDigest;
            return object;
        };

        /**
         * Converts this MessagePage to JSON.
         * @function toJSON
         * @memberof relay.MessagePage
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        MessagePage.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for MessagePage
         * @function getTypeUrl
         * @memberof relay.MessagePage
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        MessagePage.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/relay.MessagePage";
        };

        return MessagePage;
    })();

    relay.PayloadPage = (function() {

        /**
         * Properties of a PayloadPage.
         * @memberof relay
         * @interface IPayloadPage
         * @property {Array.<Uint8Array>|null} [payloads] PayloadPage payloads
         * @property {number|Long|null} [startTime] PayloadPage startTime
         * @property {number|Long|null} [endTime] PayloadPage endTime
         * @property {Uint8Array|null} [startDigest] PayloadPage startDigest
         * @property {Uint8Array|null} [endDigest] PayloadPage endDigest
         */

        /**
         * Constructs a new PayloadPage.
         * @memberof relay
         * @classdesc Represents a PayloadPage.
         * @implements IPayloadPage
         * @constructor
         * @param {relay.IPayloadPage=} [properties] Properties to set
         */
        function PayloadPage(properties) {
            this.payloads = [];
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * PayloadPage payloads.
         * @member {Array.<Uint8Array>} payloads
         * @memberof relay.PayloadPage
         * @instance
         */
        PayloadPage.prototype.payloads = $util.emptyArray;

        /**
         * PayloadPage startTime.
         * @member {number|Long} startTime
         * @memberof relay.PayloadPage
         * @instance
         */
        PayloadPage.prototype.startTime = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * PayloadPage endTime.
         * @member {number|Long} endTime
         * @memberof relay.PayloadPage
         * @instance
         */
        PayloadPage.prototype.endTime = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * PayloadPage startDigest.
         * @member {Uint8Array} startDigest
         * @memberof relay.PayloadPage
         * @instance
         */
        PayloadPage.prototype.startDigest = $util.newBuffer([]);

        /**
         * PayloadPage endDigest.
         * @member {Uint8Array} endDigest
         * @memberof relay.PayloadPage
         * @instance
         */
        PayloadPage.prototype.endDigest = $util.newBuffer([]);

        /**
         * Creates a new PayloadPage instance using the specified properties.
         * @function create
         * @memberof relay.PayloadPage
         * @static
         * @param {relay.IPayloadPage=} [properties] Properties to set
         * @returns {relay.PayloadPage} PayloadPage instance
         */
        PayloadPage.create = function create(properties) {
            return new PayloadPage(properties);
        };

        /**
         * Encodes the specified PayloadPage message. Does not implicitly {@link relay.PayloadPage.verify|verify} messages.
         * @function encode
         * @memberof relay.PayloadPage
         * @static
         * @param {relay.IPayloadPage} message PayloadPage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PayloadPage.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.payloads != null && message.payloads.length)
                for (var i = 0; i < message.payloads.length; ++i)
                    writer.uint32(/* id 1, wireType 2 =*/10).bytes(message.payloads[i]);
            if (message.startTime != null && Object.hasOwnProperty.call(message, "startTime"))
                writer.uint32(/* id 2, wireType 0 =*/16).int64(message.startTime);
            if (message.endTime != null && Object.hasOwnProperty.call(message, "endTime"))
                writer.uint32(/* id 3, wireType 0 =*/24).int64(message.endTime);
            if (message.startDigest != null && Object.hasOwnProperty.call(message, "startDigest"))
                writer.uint32(/* id 4, wireType 2 =*/34).bytes(message.startDigest);
            if (message.endDigest != null && Object.hasOwnProperty.call(message, "endDigest"))
                writer.uint32(/* id 5, wireType 2 =*/42).bytes(message.endDigest);
            return writer;
        };

        /**
         * Encodes the specified PayloadPage message, length delimited. Does not implicitly {@link relay.PayloadPage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof relay.PayloadPage
         * @static
         * @param {relay.IPayloadPage} message PayloadPage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PayloadPage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a PayloadPage message from the specified reader or buffer.
         * @function decode
         * @memberof relay.PayloadPage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {relay.PayloadPage} PayloadPage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PayloadPage.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.relay.PayloadPage();
            while (reader.pos < end) {
                var tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        if (!(message.payloads && message.payloads.length))
                            message.payloads = [];
                        message.payloads.push(reader.bytes());
                        break;
                    }
                case 2: {
                        message.startTime = reader.int64();
                        break;
                    }
                case 3: {
                        message.endTime = reader.int64();
                        break;
                    }
                case 4: {
                        message.startDigest = reader.bytes();
                        break;
                    }
                case 5: {
                        message.endDigest = reader.bytes();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a PayloadPage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof relay.PayloadPage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {relay.PayloadPage} PayloadPage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PayloadPage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a PayloadPage message.
         * @function verify
         * @memberof relay.PayloadPage
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        PayloadPage.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.payloads != null && message.hasOwnProperty("payloads")) {
                if (!Array.isArray(message.payloads))
                    return "payloads: array expected";
                for (var i = 0; i < message.payloads.length; ++i)
                    if (!(message.payloads[i] && typeof message.payloads[i].length === "number" || $util.isString(message.payloads[i])))
                        return "payloads: buffer[] expected";
            }
            if (message.startTime != null && message.hasOwnProperty("startTime"))
                if (!$util.isInteger(message.startTime) && !(message.startTime && $util.isInteger(message.startTime.low) && $util.isInteger(message.startTime.high)))
                    return "startTime: integer|Long expected";
            if (message.endTime != null && message.hasOwnProperty("endTime"))
                if (!$util.isInteger(message.endTime) && !(message.endTime && $util.isInteger(message.endTime.low) && $util.isInteger(message.endTime.high)))
                    return "endTime: integer|Long expected";
            if (message.startDigest != null && message.hasOwnProperty("startDigest"))
                if (!(message.startDigest && typeof message.startDigest.length === "number" || $util.isString(message.startDigest)))
                    return "startDigest: buffer expected";
            if (message.endDigest != null && message.hasOwnProperty("endDigest"))
                if (!(message.endDigest && typeof message.endDigest.length === "number" || $util.isString(message.endDigest)))
                    return "endDigest: buffer expected";
            return null;
        };

        /**
         * Creates a PayloadPage message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof relay.PayloadPage
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {relay.PayloadPage} PayloadPage
         */
        PayloadPage.fromObject = function fromObject(object) {
            if (object instanceof $root.relay.PayloadPage)
                return object;
            var message = new $root.relay.PayloadPage();
            if (object.payloads) {
                if (!Array.isArray(object.payloads))
                    throw TypeError(".relay.PayloadPage.payloads: array expected");
                message.payloads = [];
                for (var i = 0; i < object.payloads.length; ++i)
                    if (typeof object.payloads[i] === "string")
                        $util.base64.decode(object.payloads[i], message.payloads[i] = $util.newBuffer($util.base64.length(object.payloads[i])), 0);
                    else if (object.payloads[i].length >= 0)
                        message.payloads[i] = object.payloads[i];
            }
            if (object.startTime != null)
                if ($util.Long)
                    (message.startTime = $util.Long.fromValue(object.startTime)).unsigned = false;
                else if (typeof object.startTime === "string")
                    message.startTime = parseInt(object.startTime, 10);
                else if (typeof object.startTime === "number")
                    message.startTime = object.startTime;
                else if (typeof object.startTime === "object")
                    message.startTime = new $util.LongBits(object.startTime.low >>> 0, object.startTime.high >>> 0).toNumber();
            if (object.endTime != null)
                if ($util.Long)
                    (message.endTime = $util.Long.fromValue(object.endTime)).unsigned = false;
                else if (typeof object.endTime === "string")
                    message.endTime = parseInt(object.endTime, 10);
                else if (typeof object.endTime === "number")
                    message.endTime = object.endTime;
                else if (typeof object.endTime === "object")
                    message.endTime = new $util.LongBits(object.endTime.low >>> 0, object.endTime.high >>> 0).toNumber();
            if (object.startDigest != null)
                if (typeof object.startDigest === "string")
                    $util.base64.decode(object.startDigest, message.startDigest = $util.newBuffer($util.base64.length(object.startDigest)), 0);
                else if (object.startDigest.length >= 0)
                    message.startDigest = object.startDigest;
            if (object.endDigest != null)
                if (typeof object.endDigest === "string")
                    $util.base64.decode(object.endDigest, message.endDigest = $util.newBuffer($util.base64.length(object.endDigest)), 0);
                else if (object.endDigest.length >= 0)
                    message.endDigest = object.endDigest;
            return message;
        };

        /**
         * Creates a plain object from a PayloadPage message. Also converts values to other types if specified.
         * @function toObject
         * @memberof relay.PayloadPage
         * @static
         * @param {relay.PayloadPage} message PayloadPage
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        PayloadPage.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.arrays || options.defaults)
                object.payloads = [];
            if (options.defaults) {
                if ($util.Long) {
                    var long = new $util.Long(0, 0, false);
                    object.startTime = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.startTime = options.longs === String ? "0" : 0;
                if ($util.Long) {
                    var long = new $util.Long(0, 0, false);
                    object.endTime = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.endTime = options.longs === String ? "0" : 0;
                if (options.bytes === String)
                    object.startDigest = "";
                else {
                    object.startDigest = [];
                    if (options.bytes !== Array)
                        object.startDigest = $util.newBuffer(object.startDigest);
                }
                if (options.bytes === String)
                    object.endDigest = "";
                else {
                    object.endDigest = [];
                    if (options.bytes !== Array)
                        object.endDigest = $util.newBuffer(object.endDigest);
                }
            }
            if (message.payloads && message.payloads.length) {
                object.payloads = [];
                for (var j = 0; j < message.payloads.length; ++j)
                    object.payloads[j] = options.bytes === String ? $util.base64.encode(message.payloads[j], 0, message.payloads[j].length) : options.bytes === Array ? Array.prototype.slice.call(message.payloads[j]) : message.payloads[j];
            }
            if (message.startTime != null && message.hasOwnProperty("startTime"))
                if (typeof message.startTime === "number")
                    object.startTime = options.longs === String ? String(message.startTime) : message.startTime;
                else
                    object.startTime = options.longs === String ? $util.Long.prototype.toString.call(message.startTime) : options.longs === Number ? new $util.LongBits(message.startTime.low >>> 0, message.startTime.high >>> 0).toNumber() : message.startTime;
            if (message.endTime != null && message.hasOwnProperty("endTime"))
                if (typeof message.endTime === "number")
                    object.endTime = options.longs === String ? String(message.endTime) : message.endTime;
                else
                    object.endTime = options.longs === String ? $util.Long.prototype.toString.call(message.endTime) : options.longs === Number ? new $util.LongBits(message.endTime.low >>> 0, message.endTime.high >>> 0).toNumber() : message.endTime;
            if (message.startDigest != null && message.hasOwnProperty("startDigest"))
                object.startDigest = options.bytes === String ? $util.base64.encode(message.startDigest, 0, message.startDigest.length) : options.bytes === Array ? Array.prototype.slice.call(message.startDigest) : message.startDigest;
            if (message.endDigest != null && message.hasOwnProperty("endDigest"))
                object.endDigest = options.bytes === String ? $util.base64.encode(message.endDigest, 0, message.endDigest.length) : options.bytes === Array ? Array.prototype.slice.call(message.endDigest) : message.endDigest;
            return object;
        };

        /**
         * Converts this PayloadPage to JSON.
         * @function toJSON
         * @memberof relay.PayloadPage
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        PayloadPage.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for PayloadPage
         * @function getTypeUrl
         * @memberof relay.PayloadPage
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        PayloadPage.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/relay.PayloadPage";
        };

        return PayloadPage;
    })();

    return relay;
})();

$root.stealth = (function() {

    /**
     * Namespace stealth.
     * @exports stealth
     * @namespace
     */
    var stealth = {};

    stealth.StealthOutpoints = (function() {

        /**
         * Properties of a StealthOutpoints.
         * @memberof stealth
         * @interface IStealthOutpoints
         * @property {Uint8Array|null} [stealthTx] StealthOutpoints stealthTx
         * @property {Array.<number>|null} [vouts] StealthOutpoints vouts
         */

        /**
         * Constructs a new StealthOutpoints.
         * @memberof stealth
         * @classdesc Represents a StealthOutpoints.
         * @implements IStealthOutpoints
         * @constructor
         * @param {stealth.IStealthOutpoints=} [properties] Properties to set
         */
        function StealthOutpoints(properties) {
            this.vouts = [];
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * StealthOutpoints stealthTx.
         * @member {Uint8Array} stealthTx
         * @memberof stealth.StealthOutpoints
         * @instance
         */
        StealthOutpoints.prototype.stealthTx = $util.newBuffer([]);

        /**
         * StealthOutpoints vouts.
         * @member {Array.<number>} vouts
         * @memberof stealth.StealthOutpoints
         * @instance
         */
        StealthOutpoints.prototype.vouts = $util.emptyArray;

        /**
         * Creates a new StealthOutpoints instance using the specified properties.
         * @function create
         * @memberof stealth.StealthOutpoints
         * @static
         * @param {stealth.IStealthOutpoints=} [properties] Properties to set
         * @returns {stealth.StealthOutpoints} StealthOutpoints instance
         */
        StealthOutpoints.create = function create(properties) {
            return new StealthOutpoints(properties);
        };

        /**
         * Encodes the specified StealthOutpoints message. Does not implicitly {@link stealth.StealthOutpoints.verify|verify} messages.
         * @function encode
         * @memberof stealth.StealthOutpoints
         * @static
         * @param {stealth.IStealthOutpoints} message StealthOutpoints message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        StealthOutpoints.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.stealthTx != null && Object.hasOwnProperty.call(message, "stealthTx"))
                writer.uint32(/* id 1, wireType 2 =*/10).bytes(message.stealthTx);
            if (message.vouts != null && message.vouts.length) {
                writer.uint32(/* id 2, wireType 2 =*/18).fork();
                for (var i = 0; i < message.vouts.length; ++i)
                    writer.uint32(message.vouts[i]);
                writer.ldelim();
            }
            return writer;
        };

        /**
         * Encodes the specified StealthOutpoints message, length delimited. Does not implicitly {@link stealth.StealthOutpoints.verify|verify} messages.
         * @function encodeDelimited
         * @memberof stealth.StealthOutpoints
         * @static
         * @param {stealth.IStealthOutpoints} message StealthOutpoints message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        StealthOutpoints.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a StealthOutpoints message from the specified reader or buffer.
         * @function decode
         * @memberof stealth.StealthOutpoints
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {stealth.StealthOutpoints} StealthOutpoints
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        StealthOutpoints.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.stealth.StealthOutpoints();
            while (reader.pos < end) {
                var tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.stealthTx = reader.bytes();
                        break;
                    }
                case 2: {
                        if (!(message.vouts && message.vouts.length))
                            message.vouts = [];
                        if ((tag & 7) === 2) {
                            var end2 = reader.uint32() + reader.pos;
                            while (reader.pos < end2)
                                message.vouts.push(reader.uint32());
                        } else
                            message.vouts.push(reader.uint32());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a StealthOutpoints message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof stealth.StealthOutpoints
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {stealth.StealthOutpoints} StealthOutpoints
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        StealthOutpoints.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a StealthOutpoints message.
         * @function verify
         * @memberof stealth.StealthOutpoints
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        StealthOutpoints.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.stealthTx != null && message.hasOwnProperty("stealthTx"))
                if (!(message.stealthTx && typeof message.stealthTx.length === "number" || $util.isString(message.stealthTx)))
                    return "stealthTx: buffer expected";
            if (message.vouts != null && message.hasOwnProperty("vouts")) {
                if (!Array.isArray(message.vouts))
                    return "vouts: array expected";
                for (var i = 0; i < message.vouts.length; ++i)
                    if (!$util.isInteger(message.vouts[i]))
                        return "vouts: integer[] expected";
            }
            return null;
        };

        /**
         * Creates a StealthOutpoints message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof stealth.StealthOutpoints
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {stealth.StealthOutpoints} StealthOutpoints
         */
        StealthOutpoints.fromObject = function fromObject(object) {
            if (object instanceof $root.stealth.StealthOutpoints)
                return object;
            var message = new $root.stealth.StealthOutpoints();
            if (object.stealthTx != null)
                if (typeof object.stealthTx === "string")
                    $util.base64.decode(object.stealthTx, message.stealthTx = $util.newBuffer($util.base64.length(object.stealthTx)), 0);
                else if (object.stealthTx.length >= 0)
                    message.stealthTx = object.stealthTx;
            if (object.vouts) {
                if (!Array.isArray(object.vouts))
                    throw TypeError(".stealth.StealthOutpoints.vouts: array expected");
                message.vouts = [];
                for (var i = 0; i < object.vouts.length; ++i)
                    message.vouts[i] = object.vouts[i] >>> 0;
            }
            return message;
        };

        /**
         * Creates a plain object from a StealthOutpoints message. Also converts values to other types if specified.
         * @function toObject
         * @memberof stealth.StealthOutpoints
         * @static
         * @param {stealth.StealthOutpoints} message StealthOutpoints
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        StealthOutpoints.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.arrays || options.defaults)
                object.vouts = [];
            if (options.defaults)
                if (options.bytes === String)
                    object.stealthTx = "";
                else {
                    object.stealthTx = [];
                    if (options.bytes !== Array)
                        object.stealthTx = $util.newBuffer(object.stealthTx);
                }
            if (message.stealthTx != null && message.hasOwnProperty("stealthTx"))
                object.stealthTx = options.bytes === String ? $util.base64.encode(message.stealthTx, 0, message.stealthTx.length) : options.bytes === Array ? Array.prototype.slice.call(message.stealthTx) : message.stealthTx;
            if (message.vouts && message.vouts.length) {
                object.vouts = [];
                for (var j = 0; j < message.vouts.length; ++j)
                    object.vouts[j] = message.vouts[j];
            }
            return object;
        };

        /**
         * Converts this StealthOutpoints to JSON.
         * @function toJSON
         * @memberof stealth.StealthOutpoints
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        StealthOutpoints.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for StealthOutpoints
         * @function getTypeUrl
         * @memberof stealth.StealthOutpoints
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        StealthOutpoints.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/stealth.StealthOutpoints";
        };

        return StealthOutpoints;
    })();

    stealth.StealthPaymentEntry = (function() {

        /**
         * Properties of a StealthPaymentEntry.
         * @memberof stealth
         * @interface IStealthPaymentEntry
         * @property {Uint8Array|null} [ephemeralPubKey] StealthPaymentEntry ephemeralPubKey
         * @property {Array.<stealth.IStealthOutpoints>|null} [outpoints] StealthPaymentEntry outpoints
         */

        /**
         * Constructs a new StealthPaymentEntry.
         * @memberof stealth
         * @classdesc Represents a StealthPaymentEntry.
         * @implements IStealthPaymentEntry
         * @constructor
         * @param {stealth.IStealthPaymentEntry=} [properties] Properties to set
         */
        function StealthPaymentEntry(properties) {
            this.outpoints = [];
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * StealthPaymentEntry ephemeralPubKey.
         * @member {Uint8Array} ephemeralPubKey
         * @memberof stealth.StealthPaymentEntry
         * @instance
         */
        StealthPaymentEntry.prototype.ephemeralPubKey = $util.newBuffer([]);

        /**
         * StealthPaymentEntry outpoints.
         * @member {Array.<stealth.IStealthOutpoints>} outpoints
         * @memberof stealth.StealthPaymentEntry
         * @instance
         */
        StealthPaymentEntry.prototype.outpoints = $util.emptyArray;

        /**
         * Creates a new StealthPaymentEntry instance using the specified properties.
         * @function create
         * @memberof stealth.StealthPaymentEntry
         * @static
         * @param {stealth.IStealthPaymentEntry=} [properties] Properties to set
         * @returns {stealth.StealthPaymentEntry} StealthPaymentEntry instance
         */
        StealthPaymentEntry.create = function create(properties) {
            return new StealthPaymentEntry(properties);
        };

        /**
         * Encodes the specified StealthPaymentEntry message. Does not implicitly {@link stealth.StealthPaymentEntry.verify|verify} messages.
         * @function encode
         * @memberof stealth.StealthPaymentEntry
         * @static
         * @param {stealth.IStealthPaymentEntry} message StealthPaymentEntry message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        StealthPaymentEntry.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.ephemeralPubKey != null && Object.hasOwnProperty.call(message, "ephemeralPubKey"))
                writer.uint32(/* id 1, wireType 2 =*/10).bytes(message.ephemeralPubKey);
            if (message.outpoints != null && message.outpoints.length)
                for (var i = 0; i < message.outpoints.length; ++i)
                    $root.stealth.StealthOutpoints.encode(message.outpoints[i], writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified StealthPaymentEntry message, length delimited. Does not implicitly {@link stealth.StealthPaymentEntry.verify|verify} messages.
         * @function encodeDelimited
         * @memberof stealth.StealthPaymentEntry
         * @static
         * @param {stealth.IStealthPaymentEntry} message StealthPaymentEntry message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        StealthPaymentEntry.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a StealthPaymentEntry message from the specified reader or buffer.
         * @function decode
         * @memberof stealth.StealthPaymentEntry
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {stealth.StealthPaymentEntry} StealthPaymentEntry
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        StealthPaymentEntry.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.stealth.StealthPaymentEntry();
            while (reader.pos < end) {
                var tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.ephemeralPubKey = reader.bytes();
                        break;
                    }
                case 2: {
                        if (!(message.outpoints && message.outpoints.length))
                            message.outpoints = [];
                        message.outpoints.push($root.stealth.StealthOutpoints.decode(reader, reader.uint32()));
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a StealthPaymentEntry message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof stealth.StealthPaymentEntry
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {stealth.StealthPaymentEntry} StealthPaymentEntry
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        StealthPaymentEntry.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a StealthPaymentEntry message.
         * @function verify
         * @memberof stealth.StealthPaymentEntry
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        StealthPaymentEntry.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.ephemeralPubKey != null && message.hasOwnProperty("ephemeralPubKey"))
                if (!(message.ephemeralPubKey && typeof message.ephemeralPubKey.length === "number" || $util.isString(message.ephemeralPubKey)))
                    return "ephemeralPubKey: buffer expected";
            if (message.outpoints != null && message.hasOwnProperty("outpoints")) {
                if (!Array.isArray(message.outpoints))
                    return "outpoints: array expected";
                for (var i = 0; i < message.outpoints.length; ++i) {
                    var error = $root.stealth.StealthOutpoints.verify(message.outpoints[i]);
                    if (error)
                        return "outpoints." + error;
                }
            }
            return null;
        };

        /**
         * Creates a StealthPaymentEntry message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof stealth.StealthPaymentEntry
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {stealth.StealthPaymentEntry} StealthPaymentEntry
         */
        StealthPaymentEntry.fromObject = function fromObject(object) {
            if (object instanceof $root.stealth.StealthPaymentEntry)
                return object;
            var message = new $root.stealth.StealthPaymentEntry();
            if (object.ephemeralPubKey != null)
                if (typeof object.ephemeralPubKey === "string")
                    $util.base64.decode(object.ephemeralPubKey, message.ephemeralPubKey = $util.newBuffer($util.base64.length(object.ephemeralPubKey)), 0);
                else if (object.ephemeralPubKey.length >= 0)
                    message.ephemeralPubKey = object.ephemeralPubKey;
            if (object.outpoints) {
                if (!Array.isArray(object.outpoints))
                    throw TypeError(".stealth.StealthPaymentEntry.outpoints: array expected");
                message.outpoints = [];
                for (var i = 0; i < object.outpoints.length; ++i) {
                    if (typeof object.outpoints[i] !== "object")
                        throw TypeError(".stealth.StealthPaymentEntry.outpoints: object expected");
                    message.outpoints[i] = $root.stealth.StealthOutpoints.fromObject(object.outpoints[i]);
                }
            }
            return message;
        };

        /**
         * Creates a plain object from a StealthPaymentEntry message. Also converts values to other types if specified.
         * @function toObject
         * @memberof stealth.StealthPaymentEntry
         * @static
         * @param {stealth.StealthPaymentEntry} message StealthPaymentEntry
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        StealthPaymentEntry.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.arrays || options.defaults)
                object.outpoints = [];
            if (options.defaults)
                if (options.bytes === String)
                    object.ephemeralPubKey = "";
                else {
                    object.ephemeralPubKey = [];
                    if (options.bytes !== Array)
                        object.ephemeralPubKey = $util.newBuffer(object.ephemeralPubKey);
                }
            if (message.ephemeralPubKey != null && message.hasOwnProperty("ephemeralPubKey"))
                object.ephemeralPubKey = options.bytes === String ? $util.base64.encode(message.ephemeralPubKey, 0, message.ephemeralPubKey.length) : options.bytes === Array ? Array.prototype.slice.call(message.ephemeralPubKey) : message.ephemeralPubKey;
            if (message.outpoints && message.outpoints.length) {
                object.outpoints = [];
                for (var j = 0; j < message.outpoints.length; ++j)
                    object.outpoints[j] = $root.stealth.StealthOutpoints.toObject(message.outpoints[j], options);
            }
            return object;
        };

        /**
         * Converts this StealthPaymentEntry to JSON.
         * @function toJSON
         * @memberof stealth.StealthPaymentEntry
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        StealthPaymentEntry.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for StealthPaymentEntry
         * @function getTypeUrl
         * @memberof stealth.StealthPaymentEntry
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        StealthPaymentEntry.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/stealth.StealthPaymentEntry";
        };

        return StealthPaymentEntry;
    })();

    return stealth;
})();

$root.keyserver = (function() {

    /**
     * Namespace keyserver.
     * @exports keyserver
     * @namespace
     */
    var keyserver = {};

    keyserver.Header = (function() {

        /**
         * Properties of a Header.
         * @memberof keyserver
         * @interface IHeader
         * @property {string|null} [name] Header name
         * @property {string|null} [value] Header value
         */

        /**
         * Constructs a new Header.
         * @memberof keyserver
         * @classdesc Represents a Header.
         * @implements IHeader
         * @constructor
         * @param {keyserver.IHeader=} [properties] Properties to set
         */
        function Header(properties) {
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Header name.
         * @member {string} name
         * @memberof keyserver.Header
         * @instance
         */
        Header.prototype.name = "";

        /**
         * Header value.
         * @member {string} value
         * @memberof keyserver.Header
         * @instance
         */
        Header.prototype.value = "";

        /**
         * Creates a new Header instance using the specified properties.
         * @function create
         * @memberof keyserver.Header
         * @static
         * @param {keyserver.IHeader=} [properties] Properties to set
         * @returns {keyserver.Header} Header instance
         */
        Header.create = function create(properties) {
            return new Header(properties);
        };

        /**
         * Encodes the specified Header message. Does not implicitly {@link keyserver.Header.verify|verify} messages.
         * @function encode
         * @memberof keyserver.Header
         * @static
         * @param {keyserver.IHeader} message Header message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Header.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.name != null && Object.hasOwnProperty.call(message, "name"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.name);
            if (message.value != null && Object.hasOwnProperty.call(message, "value"))
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.value);
            return writer;
        };

        /**
         * Encodes the specified Header message, length delimited. Does not implicitly {@link keyserver.Header.verify|verify} messages.
         * @function encodeDelimited
         * @memberof keyserver.Header
         * @static
         * @param {keyserver.IHeader} message Header message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Header.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a Header message from the specified reader or buffer.
         * @function decode
         * @memberof keyserver.Header
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {keyserver.Header} Header
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Header.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.keyserver.Header();
            while (reader.pos < end) {
                var tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.name = reader.string();
                        break;
                    }
                case 2: {
                        message.value = reader.string();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a Header message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof keyserver.Header
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {keyserver.Header} Header
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Header.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a Header message.
         * @function verify
         * @memberof keyserver.Header
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        Header.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.name != null && message.hasOwnProperty("name"))
                if (!$util.isString(message.name))
                    return "name: string expected";
            if (message.value != null && message.hasOwnProperty("value"))
                if (!$util.isString(message.value))
                    return "value: string expected";
            return null;
        };

        /**
         * Creates a Header message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof keyserver.Header
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {keyserver.Header} Header
         */
        Header.fromObject = function fromObject(object) {
            if (object instanceof $root.keyserver.Header)
                return object;
            var message = new $root.keyserver.Header();
            if (object.name != null)
                message.name = String(object.name);
            if (object.value != null)
                message.value = String(object.value);
            return message;
        };

        /**
         * Creates a plain object from a Header message. Also converts values to other types if specified.
         * @function toObject
         * @memberof keyserver.Header
         * @static
         * @param {keyserver.Header} message Header
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        Header.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.defaults) {
                object.name = "";
                object.value = "";
            }
            if (message.name != null && message.hasOwnProperty("name"))
                object.name = message.name;
            if (message.value != null && message.hasOwnProperty("value"))
                object.value = message.value;
            return object;
        };

        /**
         * Converts this Header to JSON.
         * @function toJSON
         * @memberof keyserver.Header
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        Header.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for Header
         * @function getTypeUrl
         * @memberof keyserver.Header
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        Header.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/keyserver.Header";
        };

        return Header;
    })();

    keyserver.Entry = (function() {

        /**
         * Properties of an Entry.
         * @memberof keyserver
         * @interface IEntry
         * @property {string|null} [kind] Entry kind
         * @property {Array.<keyserver.IHeader>|null} [headers] Entry headers
         * @property {Uint8Array|null} [body] Entry body
         */

        /**
         * Constructs a new Entry.
         * @memberof keyserver
         * @classdesc Represents an Entry.
         * @implements IEntry
         * @constructor
         * @param {keyserver.IEntry=} [properties] Properties to set
         */
        function Entry(properties) {
            this.headers = [];
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Entry kind.
         * @member {string} kind
         * @memberof keyserver.Entry
         * @instance
         */
        Entry.prototype.kind = "";

        /**
         * Entry headers.
         * @member {Array.<keyserver.IHeader>} headers
         * @memberof keyserver.Entry
         * @instance
         */
        Entry.prototype.headers = $util.emptyArray;

        /**
         * Entry body.
         * @member {Uint8Array} body
         * @memberof keyserver.Entry
         * @instance
         */
        Entry.prototype.body = $util.newBuffer([]);

        /**
         * Creates a new Entry instance using the specified properties.
         * @function create
         * @memberof keyserver.Entry
         * @static
         * @param {keyserver.IEntry=} [properties] Properties to set
         * @returns {keyserver.Entry} Entry instance
         */
        Entry.create = function create(properties) {
            return new Entry(properties);
        };

        /**
         * Encodes the specified Entry message. Does not implicitly {@link keyserver.Entry.verify|verify} messages.
         * @function encode
         * @memberof keyserver.Entry
         * @static
         * @param {keyserver.IEntry} message Entry message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Entry.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.kind != null && Object.hasOwnProperty.call(message, "kind"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.kind);
            if (message.headers != null && message.headers.length)
                for (var i = 0; i < message.headers.length; ++i)
                    $root.keyserver.Header.encode(message.headers[i], writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
            if (message.body != null && Object.hasOwnProperty.call(message, "body"))
                writer.uint32(/* id 3, wireType 2 =*/26).bytes(message.body);
            return writer;
        };

        /**
         * Encodes the specified Entry message, length delimited. Does not implicitly {@link keyserver.Entry.verify|verify} messages.
         * @function encodeDelimited
         * @memberof keyserver.Entry
         * @static
         * @param {keyserver.IEntry} message Entry message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Entry.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes an Entry message from the specified reader or buffer.
         * @function decode
         * @memberof keyserver.Entry
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {keyserver.Entry} Entry
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Entry.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.keyserver.Entry();
            while (reader.pos < end) {
                var tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.kind = reader.string();
                        break;
                    }
                case 2: {
                        if (!(message.headers && message.headers.length))
                            message.headers = [];
                        message.headers.push($root.keyserver.Header.decode(reader, reader.uint32()));
                        break;
                    }
                case 3: {
                        message.body = reader.bytes();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes an Entry message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof keyserver.Entry
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {keyserver.Entry} Entry
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Entry.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies an Entry message.
         * @function verify
         * @memberof keyserver.Entry
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        Entry.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.kind != null && message.hasOwnProperty("kind"))
                if (!$util.isString(message.kind))
                    return "kind: string expected";
            if (message.headers != null && message.hasOwnProperty("headers")) {
                if (!Array.isArray(message.headers))
                    return "headers: array expected";
                for (var i = 0; i < message.headers.length; ++i) {
                    var error = $root.keyserver.Header.verify(message.headers[i]);
                    if (error)
                        return "headers." + error;
                }
            }
            if (message.body != null && message.hasOwnProperty("body"))
                if (!(message.body && typeof message.body.length === "number" || $util.isString(message.body)))
                    return "body: buffer expected";
            return null;
        };

        /**
         * Creates an Entry message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof keyserver.Entry
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {keyserver.Entry} Entry
         */
        Entry.fromObject = function fromObject(object) {
            if (object instanceof $root.keyserver.Entry)
                return object;
            var message = new $root.keyserver.Entry();
            if (object.kind != null)
                message.kind = String(object.kind);
            if (object.headers) {
                if (!Array.isArray(object.headers))
                    throw TypeError(".keyserver.Entry.headers: array expected");
                message.headers = [];
                for (var i = 0; i < object.headers.length; ++i) {
                    if (typeof object.headers[i] !== "object")
                        throw TypeError(".keyserver.Entry.headers: object expected");
                    message.headers[i] = $root.keyserver.Header.fromObject(object.headers[i]);
                }
            }
            if (object.body != null)
                if (typeof object.body === "string")
                    $util.base64.decode(object.body, message.body = $util.newBuffer($util.base64.length(object.body)), 0);
                else if (object.body.length >= 0)
                    message.body = object.body;
            return message;
        };

        /**
         * Creates a plain object from an Entry message. Also converts values to other types if specified.
         * @function toObject
         * @memberof keyserver.Entry
         * @static
         * @param {keyserver.Entry} message Entry
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        Entry.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.arrays || options.defaults)
                object.headers = [];
            if (options.defaults) {
                object.kind = "";
                if (options.bytes === String)
                    object.body = "";
                else {
                    object.body = [];
                    if (options.bytes !== Array)
                        object.body = $util.newBuffer(object.body);
                }
            }
            if (message.kind != null && message.hasOwnProperty("kind"))
                object.kind = message.kind;
            if (message.headers && message.headers.length) {
                object.headers = [];
                for (var j = 0; j < message.headers.length; ++j)
                    object.headers[j] = $root.keyserver.Header.toObject(message.headers[j], options);
            }
            if (message.body != null && message.hasOwnProperty("body"))
                object.body = options.bytes === String ? $util.base64.encode(message.body, 0, message.body.length) : options.bytes === Array ? Array.prototype.slice.call(message.body) : message.body;
            return object;
        };

        /**
         * Converts this Entry to JSON.
         * @function toJSON
         * @memberof keyserver.Entry
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        Entry.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for Entry
         * @function getTypeUrl
         * @memberof keyserver.Entry
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        Entry.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/keyserver.Entry";
        };

        return Entry;
    })();

    keyserver.AddressMetadata = (function() {

        /**
         * Properties of an AddressMetadata.
         * @memberof keyserver
         * @interface IAddressMetadata
         * @property {number|Long|null} [timestamp] AddressMetadata timestamp
         * @property {number|Long|null} [ttl] AddressMetadata ttl
         * @property {Array.<keyserver.IEntry>|null} [entries] AddressMetadata entries
         */

        /**
         * Constructs a new AddressMetadata.
         * @memberof keyserver
         * @classdesc Represents an AddressMetadata.
         * @implements IAddressMetadata
         * @constructor
         * @param {keyserver.IAddressMetadata=} [properties] Properties to set
         */
        function AddressMetadata(properties) {
            this.entries = [];
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * AddressMetadata timestamp.
         * @member {number|Long} timestamp
         * @memberof keyserver.AddressMetadata
         * @instance
         */
        AddressMetadata.prototype.timestamp = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * AddressMetadata ttl.
         * @member {number|Long} ttl
         * @memberof keyserver.AddressMetadata
         * @instance
         */
        AddressMetadata.prototype.ttl = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * AddressMetadata entries.
         * @member {Array.<keyserver.IEntry>} entries
         * @memberof keyserver.AddressMetadata
         * @instance
         */
        AddressMetadata.prototype.entries = $util.emptyArray;

        /**
         * Creates a new AddressMetadata instance using the specified properties.
         * @function create
         * @memberof keyserver.AddressMetadata
         * @static
         * @param {keyserver.IAddressMetadata=} [properties] Properties to set
         * @returns {keyserver.AddressMetadata} AddressMetadata instance
         */
        AddressMetadata.create = function create(properties) {
            return new AddressMetadata(properties);
        };

        /**
         * Encodes the specified AddressMetadata message. Does not implicitly {@link keyserver.AddressMetadata.verify|verify} messages.
         * @function encode
         * @memberof keyserver.AddressMetadata
         * @static
         * @param {keyserver.IAddressMetadata} message AddressMetadata message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        AddressMetadata.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.timestamp != null && Object.hasOwnProperty.call(message, "timestamp"))
                writer.uint32(/* id 1, wireType 0 =*/8).int64(message.timestamp);
            if (message.ttl != null && Object.hasOwnProperty.call(message, "ttl"))
                writer.uint32(/* id 2, wireType 0 =*/16).int64(message.ttl);
            if (message.entries != null && message.entries.length)
                for (var i = 0; i < message.entries.length; ++i)
                    $root.keyserver.Entry.encode(message.entries[i], writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified AddressMetadata message, length delimited. Does not implicitly {@link keyserver.AddressMetadata.verify|verify} messages.
         * @function encodeDelimited
         * @memberof keyserver.AddressMetadata
         * @static
         * @param {keyserver.IAddressMetadata} message AddressMetadata message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        AddressMetadata.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes an AddressMetadata message from the specified reader or buffer.
         * @function decode
         * @memberof keyserver.AddressMetadata
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {keyserver.AddressMetadata} AddressMetadata
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        AddressMetadata.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.keyserver.AddressMetadata();
            while (reader.pos < end) {
                var tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.timestamp = reader.int64();
                        break;
                    }
                case 2: {
                        message.ttl = reader.int64();
                        break;
                    }
                case 3: {
                        if (!(message.entries && message.entries.length))
                            message.entries = [];
                        message.entries.push($root.keyserver.Entry.decode(reader, reader.uint32()));
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes an AddressMetadata message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof keyserver.AddressMetadata
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {keyserver.AddressMetadata} AddressMetadata
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        AddressMetadata.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies an AddressMetadata message.
         * @function verify
         * @memberof keyserver.AddressMetadata
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        AddressMetadata.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.timestamp != null && message.hasOwnProperty("timestamp"))
                if (!$util.isInteger(message.timestamp) && !(message.timestamp && $util.isInteger(message.timestamp.low) && $util.isInteger(message.timestamp.high)))
                    return "timestamp: integer|Long expected";
            if (message.ttl != null && message.hasOwnProperty("ttl"))
                if (!$util.isInteger(message.ttl) && !(message.ttl && $util.isInteger(message.ttl.low) && $util.isInteger(message.ttl.high)))
                    return "ttl: integer|Long expected";
            if (message.entries != null && message.hasOwnProperty("entries")) {
                if (!Array.isArray(message.entries))
                    return "entries: array expected";
                for (var i = 0; i < message.entries.length; ++i) {
                    var error = $root.keyserver.Entry.verify(message.entries[i]);
                    if (error)
                        return "entries." + error;
                }
            }
            return null;
        };

        /**
         * Creates an AddressMetadata message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof keyserver.AddressMetadata
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {keyserver.AddressMetadata} AddressMetadata
         */
        AddressMetadata.fromObject = function fromObject(object) {
            if (object instanceof $root.keyserver.AddressMetadata)
                return object;
            var message = new $root.keyserver.AddressMetadata();
            if (object.timestamp != null)
                if ($util.Long)
                    (message.timestamp = $util.Long.fromValue(object.timestamp)).unsigned = false;
                else if (typeof object.timestamp === "string")
                    message.timestamp = parseInt(object.timestamp, 10);
                else if (typeof object.timestamp === "number")
                    message.timestamp = object.timestamp;
                else if (typeof object.timestamp === "object")
                    message.timestamp = new $util.LongBits(object.timestamp.low >>> 0, object.timestamp.high >>> 0).toNumber();
            if (object.ttl != null)
                if ($util.Long)
                    (message.ttl = $util.Long.fromValue(object.ttl)).unsigned = false;
                else if (typeof object.ttl === "string")
                    message.ttl = parseInt(object.ttl, 10);
                else if (typeof object.ttl === "number")
                    message.ttl = object.ttl;
                else if (typeof object.ttl === "object")
                    message.ttl = new $util.LongBits(object.ttl.low >>> 0, object.ttl.high >>> 0).toNumber();
            if (object.entries) {
                if (!Array.isArray(object.entries))
                    throw TypeError(".keyserver.AddressMetadata.entries: array expected");
                message.entries = [];
                for (var i = 0; i < object.entries.length; ++i) {
                    if (typeof object.entries[i] !== "object")
                        throw TypeError(".keyserver.AddressMetadata.entries: object expected");
                    message.entries[i] = $root.keyserver.Entry.fromObject(object.entries[i]);
                }
            }
            return message;
        };

        /**
         * Creates a plain object from an AddressMetadata message. Also converts values to other types if specified.
         * @function toObject
         * @memberof keyserver.AddressMetadata
         * @static
         * @param {keyserver.AddressMetadata} message AddressMetadata
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        AddressMetadata.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.arrays || options.defaults)
                object.entries = [];
            if (options.defaults) {
                if ($util.Long) {
                    var long = new $util.Long(0, 0, false);
                    object.timestamp = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.timestamp = options.longs === String ? "0" : 0;
                if ($util.Long) {
                    var long = new $util.Long(0, 0, false);
                    object.ttl = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.ttl = options.longs === String ? "0" : 0;
            }
            if (message.timestamp != null && message.hasOwnProperty("timestamp"))
                if (typeof message.timestamp === "number")
                    object.timestamp = options.longs === String ? String(message.timestamp) : message.timestamp;
                else
                    object.timestamp = options.longs === String ? $util.Long.prototype.toString.call(message.timestamp) : options.longs === Number ? new $util.LongBits(message.timestamp.low >>> 0, message.timestamp.high >>> 0).toNumber() : message.timestamp;
            if (message.ttl != null && message.hasOwnProperty("ttl"))
                if (typeof message.ttl === "number")
                    object.ttl = options.longs === String ? String(message.ttl) : message.ttl;
                else
                    object.ttl = options.longs === String ? $util.Long.prototype.toString.call(message.ttl) : options.longs === Number ? new $util.LongBits(message.ttl.low >>> 0, message.ttl.high >>> 0).toNumber() : message.ttl;
            if (message.entries && message.entries.length) {
                object.entries = [];
                for (var j = 0; j < message.entries.length; ++j)
                    object.entries[j] = $root.keyserver.Entry.toObject(message.entries[j], options);
            }
            return object;
        };

        /**
         * Converts this AddressMetadata to JSON.
         * @function toJSON
         * @memberof keyserver.AddressMetadata
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        AddressMetadata.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for AddressMetadata
         * @function getTypeUrl
         * @memberof keyserver.AddressMetadata
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        AddressMetadata.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/keyserver.AddressMetadata";
        };

        return AddressMetadata;
    })();

    keyserver.Peer = (function() {

        /**
         * Properties of a Peer.
         * @memberof keyserver
         * @interface IPeer
         * @property {string|null} [url] Peer url
         */

        /**
         * Constructs a new Peer.
         * @memberof keyserver
         * @classdesc Represents a Peer.
         * @implements IPeer
         * @constructor
         * @param {keyserver.IPeer=} [properties] Properties to set
         */
        function Peer(properties) {
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Peer url.
         * @member {string} url
         * @memberof keyserver.Peer
         * @instance
         */
        Peer.prototype.url = "";

        /**
         * Creates a new Peer instance using the specified properties.
         * @function create
         * @memberof keyserver.Peer
         * @static
         * @param {keyserver.IPeer=} [properties] Properties to set
         * @returns {keyserver.Peer} Peer instance
         */
        Peer.create = function create(properties) {
            return new Peer(properties);
        };

        /**
         * Encodes the specified Peer message. Does not implicitly {@link keyserver.Peer.verify|verify} messages.
         * @function encode
         * @memberof keyserver.Peer
         * @static
         * @param {keyserver.IPeer} message Peer message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Peer.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.url != null && Object.hasOwnProperty.call(message, "url"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.url);
            return writer;
        };

        /**
         * Encodes the specified Peer message, length delimited. Does not implicitly {@link keyserver.Peer.verify|verify} messages.
         * @function encodeDelimited
         * @memberof keyserver.Peer
         * @static
         * @param {keyserver.IPeer} message Peer message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Peer.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a Peer message from the specified reader or buffer.
         * @function decode
         * @memberof keyserver.Peer
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {keyserver.Peer} Peer
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Peer.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.keyserver.Peer();
            while (reader.pos < end) {
                var tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.url = reader.string();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a Peer message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof keyserver.Peer
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {keyserver.Peer} Peer
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Peer.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a Peer message.
         * @function verify
         * @memberof keyserver.Peer
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        Peer.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.url != null && message.hasOwnProperty("url"))
                if (!$util.isString(message.url))
                    return "url: string expected";
            return null;
        };

        /**
         * Creates a Peer message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof keyserver.Peer
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {keyserver.Peer} Peer
         */
        Peer.fromObject = function fromObject(object) {
            if (object instanceof $root.keyserver.Peer)
                return object;
            var message = new $root.keyserver.Peer();
            if (object.url != null)
                message.url = String(object.url);
            return message;
        };

        /**
         * Creates a plain object from a Peer message. Also converts values to other types if specified.
         * @function toObject
         * @memberof keyserver.Peer
         * @static
         * @param {keyserver.Peer} message Peer
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        Peer.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.defaults)
                object.url = "";
            if (message.url != null && message.hasOwnProperty("url"))
                object.url = message.url;
            return object;
        };

        /**
         * Converts this Peer to JSON.
         * @function toJSON
         * @memberof keyserver.Peer
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        Peer.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for Peer
         * @function getTypeUrl
         * @memberof keyserver.Peer
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        Peer.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/keyserver.Peer";
        };

        return Peer;
    })();

    keyserver.Peers = (function() {

        /**
         * Properties of a Peers.
         * @memberof keyserver
         * @interface IPeers
         * @property {Array.<keyserver.IPeer>|null} [peers] Peers peers
         */

        /**
         * Constructs a new Peers.
         * @memberof keyserver
         * @classdesc Represents a Peers.
         * @implements IPeers
         * @constructor
         * @param {keyserver.IPeers=} [properties] Properties to set
         */
        function Peers(properties) {
            this.peers = [];
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Peers peers.
         * @member {Array.<keyserver.IPeer>} peers
         * @memberof keyserver.Peers
         * @instance
         */
        Peers.prototype.peers = $util.emptyArray;

        /**
         * Creates a new Peers instance using the specified properties.
         * @function create
         * @memberof keyserver.Peers
         * @static
         * @param {keyserver.IPeers=} [properties] Properties to set
         * @returns {keyserver.Peers} Peers instance
         */
        Peers.create = function create(properties) {
            return new Peers(properties);
        };

        /**
         * Encodes the specified Peers message. Does not implicitly {@link keyserver.Peers.verify|verify} messages.
         * @function encode
         * @memberof keyserver.Peers
         * @static
         * @param {keyserver.IPeers} message Peers message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Peers.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.peers != null && message.peers.length)
                for (var i = 0; i < message.peers.length; ++i)
                    $root.keyserver.Peer.encode(message.peers[i], writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified Peers message, length delimited. Does not implicitly {@link keyserver.Peers.verify|verify} messages.
         * @function encodeDelimited
         * @memberof keyserver.Peers
         * @static
         * @param {keyserver.IPeers} message Peers message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Peers.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a Peers message from the specified reader or buffer.
         * @function decode
         * @memberof keyserver.Peers
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {keyserver.Peers} Peers
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Peers.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.keyserver.Peers();
            while (reader.pos < end) {
                var tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        if (!(message.peers && message.peers.length))
                            message.peers = [];
                        message.peers.push($root.keyserver.Peer.decode(reader, reader.uint32()));
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a Peers message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof keyserver.Peers
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {keyserver.Peers} Peers
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Peers.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a Peers message.
         * @function verify
         * @memberof keyserver.Peers
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        Peers.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.peers != null && message.hasOwnProperty("peers")) {
                if (!Array.isArray(message.peers))
                    return "peers: array expected";
                for (var i = 0; i < message.peers.length; ++i) {
                    var error = $root.keyserver.Peer.verify(message.peers[i]);
                    if (error)
                        return "peers." + error;
                }
            }
            return null;
        };

        /**
         * Creates a Peers message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof keyserver.Peers
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {keyserver.Peers} Peers
         */
        Peers.fromObject = function fromObject(object) {
            if (object instanceof $root.keyserver.Peers)
                return object;
            var message = new $root.keyserver.Peers();
            if (object.peers) {
                if (!Array.isArray(object.peers))
                    throw TypeError(".keyserver.Peers.peers: array expected");
                message.peers = [];
                for (var i = 0; i < object.peers.length; ++i) {
                    if (typeof object.peers[i] !== "object")
                        throw TypeError(".keyserver.Peers.peers: object expected");
                    message.peers[i] = $root.keyserver.Peer.fromObject(object.peers[i]);
                }
            }
            return message;
        };

        /**
         * Creates a plain object from a Peers message. Also converts values to other types if specified.
         * @function toObject
         * @memberof keyserver.Peers
         * @static
         * @param {keyserver.Peers} message Peers
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        Peers.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.arrays || options.defaults)
                object.peers = [];
            if (message.peers && message.peers.length) {
                object.peers = [];
                for (var j = 0; j < message.peers.length; ++j)
                    object.peers[j] = $root.keyserver.Peer.toObject(message.peers[j], options);
            }
            return object;
        };

        /**
         * Converts this Peers to JSON.
         * @function toJSON
         * @memberof keyserver.Peers
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        Peers.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for Peers
         * @function getTypeUrl
         * @memberof keyserver.Peers
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        Peers.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/keyserver.Peers";
        };

        return Peers;
    })();

    return keyserver;
})();

$root.wrapper = (function() {

    /**
     * Namespace wrapper.
     * @exports wrapper
     * @namespace
     */
    var wrapper = {};

    wrapper.BurnOutputs = (function() {

        /**
         * Properties of a BurnOutputs.
         * @memberof wrapper
         * @interface IBurnOutputs
         * @property {Uint8Array|null} [tx] BurnOutputs tx
         * @property {number|null} [index] BurnOutputs index
         */

        /**
         * Constructs a new BurnOutputs.
         * @memberof wrapper
         * @classdesc Represents a BurnOutputs.
         * @implements IBurnOutputs
         * @constructor
         * @param {wrapper.IBurnOutputs=} [properties] Properties to set
         */
        function BurnOutputs(properties) {
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * BurnOutputs tx.
         * @member {Uint8Array} tx
         * @memberof wrapper.BurnOutputs
         * @instance
         */
        BurnOutputs.prototype.tx = $util.newBuffer([]);

        /**
         * BurnOutputs index.
         * @member {number} index
         * @memberof wrapper.BurnOutputs
         * @instance
         */
        BurnOutputs.prototype.index = 0;

        /**
         * Creates a new BurnOutputs instance using the specified properties.
         * @function create
         * @memberof wrapper.BurnOutputs
         * @static
         * @param {wrapper.IBurnOutputs=} [properties] Properties to set
         * @returns {wrapper.BurnOutputs} BurnOutputs instance
         */
        BurnOutputs.create = function create(properties) {
            return new BurnOutputs(properties);
        };

        /**
         * Encodes the specified BurnOutputs message. Does not implicitly {@link wrapper.BurnOutputs.verify|verify} messages.
         * @function encode
         * @memberof wrapper.BurnOutputs
         * @static
         * @param {wrapper.IBurnOutputs} message BurnOutputs message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        BurnOutputs.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.tx != null && Object.hasOwnProperty.call(message, "tx"))
                writer.uint32(/* id 1, wireType 2 =*/10).bytes(message.tx);
            if (message.index != null && Object.hasOwnProperty.call(message, "index"))
                writer.uint32(/* id 2, wireType 0 =*/16).uint32(message.index);
            return writer;
        };

        /**
         * Encodes the specified BurnOutputs message, length delimited. Does not implicitly {@link wrapper.BurnOutputs.verify|verify} messages.
         * @function encodeDelimited
         * @memberof wrapper.BurnOutputs
         * @static
         * @param {wrapper.IBurnOutputs} message BurnOutputs message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        BurnOutputs.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a BurnOutputs message from the specified reader or buffer.
         * @function decode
         * @memberof wrapper.BurnOutputs
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {wrapper.BurnOutputs} BurnOutputs
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        BurnOutputs.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.wrapper.BurnOutputs();
            while (reader.pos < end) {
                var tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.tx = reader.bytes();
                        break;
                    }
                case 2: {
                        message.index = reader.uint32();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a BurnOutputs message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof wrapper.BurnOutputs
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {wrapper.BurnOutputs} BurnOutputs
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        BurnOutputs.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a BurnOutputs message.
         * @function verify
         * @memberof wrapper.BurnOutputs
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        BurnOutputs.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.tx != null && message.hasOwnProperty("tx"))
                if (!(message.tx && typeof message.tx.length === "number" || $util.isString(message.tx)))
                    return "tx: buffer expected";
            if (message.index != null && message.hasOwnProperty("index"))
                if (!$util.isInteger(message.index))
                    return "index: integer expected";
            return null;
        };

        /**
         * Creates a BurnOutputs message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof wrapper.BurnOutputs
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {wrapper.BurnOutputs} BurnOutputs
         */
        BurnOutputs.fromObject = function fromObject(object) {
            if (object instanceof $root.wrapper.BurnOutputs)
                return object;
            var message = new $root.wrapper.BurnOutputs();
            if (object.tx != null)
                if (typeof object.tx === "string")
                    $util.base64.decode(object.tx, message.tx = $util.newBuffer($util.base64.length(object.tx)), 0);
                else if (object.tx.length >= 0)
                    message.tx = object.tx;
            if (object.index != null)
                message.index = object.index >>> 0;
            return message;
        };

        /**
         * Creates a plain object from a BurnOutputs message. Also converts values to other types if specified.
         * @function toObject
         * @memberof wrapper.BurnOutputs
         * @static
         * @param {wrapper.BurnOutputs} message BurnOutputs
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        BurnOutputs.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.defaults) {
                if (options.bytes === String)
                    object.tx = "";
                else {
                    object.tx = [];
                    if (options.bytes !== Array)
                        object.tx = $util.newBuffer(object.tx);
                }
                object.index = 0;
            }
            if (message.tx != null && message.hasOwnProperty("tx"))
                object.tx = options.bytes === String ? $util.base64.encode(message.tx, 0, message.tx.length) : options.bytes === Array ? Array.prototype.slice.call(message.tx) : message.tx;
            if (message.index != null && message.hasOwnProperty("index"))
                object.index = message.index;
            return object;
        };

        /**
         * Converts this BurnOutputs to JSON.
         * @function toJSON
         * @memberof wrapper.BurnOutputs
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        BurnOutputs.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for BurnOutputs
         * @function getTypeUrl
         * @memberof wrapper.BurnOutputs
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        BurnOutputs.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/wrapper.BurnOutputs";
        };

        return BurnOutputs;
    })();

    wrapper.SignedPayload = (function() {

        /**
         * Properties of a SignedPayload.
         * @memberof wrapper
         * @interface ISignedPayload
         * @property {Uint8Array|null} [publicKey] SignedPayload publicKey
         * @property {Uint8Array|null} [signature] SignedPayload signature
         * @property {wrapper.SignedPayload.SignatureScheme|null} [scheme] SignedPayload scheme
         * @property {Uint8Array|null} [payload] SignedPayload payload
         * @property {Uint8Array|null} [payloadDigest] SignedPayload payloadDigest
         * @property {number|Long|null} [burnAmount] SignedPayload burnAmount
         * @property {Array.<wrapper.IBurnOutputs>|null} [transactions] SignedPayload transactions
         */

        /**
         * Constructs a new SignedPayload.
         * @memberof wrapper
         * @classdesc Represents a SignedPayload.
         * @implements ISignedPayload
         * @constructor
         * @param {wrapper.ISignedPayload=} [properties] Properties to set
         */
        function SignedPayload(properties) {
            this.transactions = [];
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * SignedPayload publicKey.
         * @member {Uint8Array} publicKey
         * @memberof wrapper.SignedPayload
         * @instance
         */
        SignedPayload.prototype.publicKey = $util.newBuffer([]);

        /**
         * SignedPayload signature.
         * @member {Uint8Array} signature
         * @memberof wrapper.SignedPayload
         * @instance
         */
        SignedPayload.prototype.signature = $util.newBuffer([]);

        /**
         * SignedPayload scheme.
         * @member {wrapper.SignedPayload.SignatureScheme} scheme
         * @memberof wrapper.SignedPayload
         * @instance
         */
        SignedPayload.prototype.scheme = 0;

        /**
         * SignedPayload payload.
         * @member {Uint8Array} payload
         * @memberof wrapper.SignedPayload
         * @instance
         */
        SignedPayload.prototype.payload = $util.newBuffer([]);

        /**
         * SignedPayload payloadDigest.
         * @member {Uint8Array} payloadDigest
         * @memberof wrapper.SignedPayload
         * @instance
         */
        SignedPayload.prototype.payloadDigest = $util.newBuffer([]);

        /**
         * SignedPayload burnAmount.
         * @member {number|Long} burnAmount
         * @memberof wrapper.SignedPayload
         * @instance
         */
        SignedPayload.prototype.burnAmount = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * SignedPayload transactions.
         * @member {Array.<wrapper.IBurnOutputs>} transactions
         * @memberof wrapper.SignedPayload
         * @instance
         */
        SignedPayload.prototype.transactions = $util.emptyArray;

        /**
         * Creates a new SignedPayload instance using the specified properties.
         * @function create
         * @memberof wrapper.SignedPayload
         * @static
         * @param {wrapper.ISignedPayload=} [properties] Properties to set
         * @returns {wrapper.SignedPayload} SignedPayload instance
         */
        SignedPayload.create = function create(properties) {
            return new SignedPayload(properties);
        };

        /**
         * Encodes the specified SignedPayload message. Does not implicitly {@link wrapper.SignedPayload.verify|verify} messages.
         * @function encode
         * @memberof wrapper.SignedPayload
         * @static
         * @param {wrapper.ISignedPayload} message SignedPayload message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SignedPayload.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.publicKey != null && Object.hasOwnProperty.call(message, "publicKey"))
                writer.uint32(/* id 1, wireType 2 =*/10).bytes(message.publicKey);
            if (message.signature != null && Object.hasOwnProperty.call(message, "signature"))
                writer.uint32(/* id 2, wireType 2 =*/18).bytes(message.signature);
            if (message.scheme != null && Object.hasOwnProperty.call(message, "scheme"))
                writer.uint32(/* id 3, wireType 0 =*/24).int32(message.scheme);
            if (message.payload != null && Object.hasOwnProperty.call(message, "payload"))
                writer.uint32(/* id 4, wireType 2 =*/34).bytes(message.payload);
            if (message.payloadDigest != null && Object.hasOwnProperty.call(message, "payloadDigest"))
                writer.uint32(/* id 5, wireType 2 =*/42).bytes(message.payloadDigest);
            if (message.burnAmount != null && Object.hasOwnProperty.call(message, "burnAmount"))
                writer.uint32(/* id 6, wireType 0 =*/48).int64(message.burnAmount);
            if (message.transactions != null && message.transactions.length)
                for (var i = 0; i < message.transactions.length; ++i)
                    $root.wrapper.BurnOutputs.encode(message.transactions[i], writer.uint32(/* id 7, wireType 2 =*/58).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified SignedPayload message, length delimited. Does not implicitly {@link wrapper.SignedPayload.verify|verify} messages.
         * @function encodeDelimited
         * @memberof wrapper.SignedPayload
         * @static
         * @param {wrapper.ISignedPayload} message SignedPayload message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SignedPayload.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a SignedPayload message from the specified reader or buffer.
         * @function decode
         * @memberof wrapper.SignedPayload
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {wrapper.SignedPayload} SignedPayload
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SignedPayload.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.wrapper.SignedPayload();
            while (reader.pos < end) {
                var tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.publicKey = reader.bytes();
                        break;
                    }
                case 2: {
                        message.signature = reader.bytes();
                        break;
                    }
                case 3: {
                        message.scheme = reader.int32();
                        break;
                    }
                case 4: {
                        message.payload = reader.bytes();
                        break;
                    }
                case 5: {
                        message.payloadDigest = reader.bytes();
                        break;
                    }
                case 6: {
                        message.burnAmount = reader.int64();
                        break;
                    }
                case 7: {
                        if (!(message.transactions && message.transactions.length))
                            message.transactions = [];
                        message.transactions.push($root.wrapper.BurnOutputs.decode(reader, reader.uint32()));
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a SignedPayload message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof wrapper.SignedPayload
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {wrapper.SignedPayload} SignedPayload
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SignedPayload.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a SignedPayload message.
         * @function verify
         * @memberof wrapper.SignedPayload
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        SignedPayload.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.publicKey != null && message.hasOwnProperty("publicKey"))
                if (!(message.publicKey && typeof message.publicKey.length === "number" || $util.isString(message.publicKey)))
                    return "publicKey: buffer expected";
            if (message.signature != null && message.hasOwnProperty("signature"))
                if (!(message.signature && typeof message.signature.length === "number" || $util.isString(message.signature)))
                    return "signature: buffer expected";
            if (message.scheme != null && message.hasOwnProperty("scheme"))
                switch (message.scheme) {
                default:
                    return "scheme: enum value expected";
                case 0:
                case 1:
                    break;
                }
            if (message.payload != null && message.hasOwnProperty("payload"))
                if (!(message.payload && typeof message.payload.length === "number" || $util.isString(message.payload)))
                    return "payload: buffer expected";
            if (message.payloadDigest != null && message.hasOwnProperty("payloadDigest"))
                if (!(message.payloadDigest && typeof message.payloadDigest.length === "number" || $util.isString(message.payloadDigest)))
                    return "payloadDigest: buffer expected";
            if (message.burnAmount != null && message.hasOwnProperty("burnAmount"))
                if (!$util.isInteger(message.burnAmount) && !(message.burnAmount && $util.isInteger(message.burnAmount.low) && $util.isInteger(message.burnAmount.high)))
                    return "burnAmount: integer|Long expected";
            if (message.transactions != null && message.hasOwnProperty("transactions")) {
                if (!Array.isArray(message.transactions))
                    return "transactions: array expected";
                for (var i = 0; i < message.transactions.length; ++i) {
                    var error = $root.wrapper.BurnOutputs.verify(message.transactions[i]);
                    if (error)
                        return "transactions." + error;
                }
            }
            return null;
        };

        /**
         * Creates a SignedPayload message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof wrapper.SignedPayload
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {wrapper.SignedPayload} SignedPayload
         */
        SignedPayload.fromObject = function fromObject(object) {
            if (object instanceof $root.wrapper.SignedPayload)
                return object;
            var message = new $root.wrapper.SignedPayload();
            if (object.publicKey != null)
                if (typeof object.publicKey === "string")
                    $util.base64.decode(object.publicKey, message.publicKey = $util.newBuffer($util.base64.length(object.publicKey)), 0);
                else if (object.publicKey.length >= 0)
                    message.publicKey = object.publicKey;
            if (object.signature != null)
                if (typeof object.signature === "string")
                    $util.base64.decode(object.signature, message.signature = $util.newBuffer($util.base64.length(object.signature)), 0);
                else if (object.signature.length >= 0)
                    message.signature = object.signature;
            switch (object.scheme) {
            default:
                if (typeof object.scheme === "number") {
                    message.scheme = object.scheme;
                    break;
                }
                break;
            case "SCHNORR":
            case 0:
                message.scheme = 0;
                break;
            case "ECDSA":
            case 1:
                message.scheme = 1;
                break;
            }
            if (object.payload != null)
                if (typeof object.payload === "string")
                    $util.base64.decode(object.payload, message.payload = $util.newBuffer($util.base64.length(object.payload)), 0);
                else if (object.payload.length >= 0)
                    message.payload = object.payload;
            if (object.payloadDigest != null)
                if (typeof object.payloadDigest === "string")
                    $util.base64.decode(object.payloadDigest, message.payloadDigest = $util.newBuffer($util.base64.length(object.payloadDigest)), 0);
                else if (object.payloadDigest.length >= 0)
                    message.payloadDigest = object.payloadDigest;
            if (object.burnAmount != null)
                if ($util.Long)
                    (message.burnAmount = $util.Long.fromValue(object.burnAmount)).unsigned = false;
                else if (typeof object.burnAmount === "string")
                    message.burnAmount = parseInt(object.burnAmount, 10);
                else if (typeof object.burnAmount === "number")
                    message.burnAmount = object.burnAmount;
                else if (typeof object.burnAmount === "object")
                    message.burnAmount = new $util.LongBits(object.burnAmount.low >>> 0, object.burnAmount.high >>> 0).toNumber();
            if (object.transactions) {
                if (!Array.isArray(object.transactions))
                    throw TypeError(".wrapper.SignedPayload.transactions: array expected");
                message.transactions = [];
                for (var i = 0; i < object.transactions.length; ++i) {
                    if (typeof object.transactions[i] !== "object")
                        throw TypeError(".wrapper.SignedPayload.transactions: object expected");
                    message.transactions[i] = $root.wrapper.BurnOutputs.fromObject(object.transactions[i]);
                }
            }
            return message;
        };

        /**
         * Creates a plain object from a SignedPayload message. Also converts values to other types if specified.
         * @function toObject
         * @memberof wrapper.SignedPayload
         * @static
         * @param {wrapper.SignedPayload} message SignedPayload
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        SignedPayload.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.arrays || options.defaults)
                object.transactions = [];
            if (options.defaults) {
                if (options.bytes === String)
                    object.publicKey = "";
                else {
                    object.publicKey = [];
                    if (options.bytes !== Array)
                        object.publicKey = $util.newBuffer(object.publicKey);
                }
                if (options.bytes === String)
                    object.signature = "";
                else {
                    object.signature = [];
                    if (options.bytes !== Array)
                        object.signature = $util.newBuffer(object.signature);
                }
                object.scheme = options.enums === String ? "SCHNORR" : 0;
                if (options.bytes === String)
                    object.payload = "";
                else {
                    object.payload = [];
                    if (options.bytes !== Array)
                        object.payload = $util.newBuffer(object.payload);
                }
                if (options.bytes === String)
                    object.payloadDigest = "";
                else {
                    object.payloadDigest = [];
                    if (options.bytes !== Array)
                        object.payloadDigest = $util.newBuffer(object.payloadDigest);
                }
                if ($util.Long) {
                    var long = new $util.Long(0, 0, false);
                    object.burnAmount = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.burnAmount = options.longs === String ? "0" : 0;
            }
            if (message.publicKey != null && message.hasOwnProperty("publicKey"))
                object.publicKey = options.bytes === String ? $util.base64.encode(message.publicKey, 0, message.publicKey.length) : options.bytes === Array ? Array.prototype.slice.call(message.publicKey) : message.publicKey;
            if (message.signature != null && message.hasOwnProperty("signature"))
                object.signature = options.bytes === String ? $util.base64.encode(message.signature, 0, message.signature.length) : options.bytes === Array ? Array.prototype.slice.call(message.signature) : message.signature;
            if (message.scheme != null && message.hasOwnProperty("scheme"))
                object.scheme = options.enums === String ? $root.wrapper.SignedPayload.SignatureScheme[message.scheme] === undefined ? message.scheme : $root.wrapper.SignedPayload.SignatureScheme[message.scheme] : message.scheme;
            if (message.payload != null && message.hasOwnProperty("payload"))
                object.payload = options.bytes === String ? $util.base64.encode(message.payload, 0, message.payload.length) : options.bytes === Array ? Array.prototype.slice.call(message.payload) : message.payload;
            if (message.payloadDigest != null && message.hasOwnProperty("payloadDigest"))
                object.payloadDigest = options.bytes === String ? $util.base64.encode(message.payloadDigest, 0, message.payloadDigest.length) : options.bytes === Array ? Array.prototype.slice.call(message.payloadDigest) : message.payloadDigest;
            if (message.burnAmount != null && message.hasOwnProperty("burnAmount"))
                if (typeof message.burnAmount === "number")
                    object.burnAmount = options.longs === String ? String(message.burnAmount) : message.burnAmount;
                else
                    object.burnAmount = options.longs === String ? $util.Long.prototype.toString.call(message.burnAmount) : options.longs === Number ? new $util.LongBits(message.burnAmount.low >>> 0, message.burnAmount.high >>> 0).toNumber() : message.burnAmount;
            if (message.transactions && message.transactions.length) {
                object.transactions = [];
                for (var j = 0; j < message.transactions.length; ++j)
                    object.transactions[j] = $root.wrapper.BurnOutputs.toObject(message.transactions[j], options);
            }
            return object;
        };

        /**
         * Converts this SignedPayload to JSON.
         * @function toJSON
         * @memberof wrapper.SignedPayload
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        SignedPayload.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for SignedPayload
         * @function getTypeUrl
         * @memberof wrapper.SignedPayload
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        SignedPayload.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/wrapper.SignedPayload";
        };

        /**
         * SignatureScheme enum.
         * @name wrapper.SignedPayload.SignatureScheme
         * @enum {number}
         * @property {number} SCHNORR=0 SCHNORR value
         * @property {number} ECDSA=1 ECDSA value
         */
        SignedPayload.SignatureScheme = (function() {
            var valuesById = {}, values = Object.create(valuesById);
            values[valuesById[0] = "SCHNORR"] = 0;
            values[valuesById[1] = "ECDSA"] = 1;
            return values;
        })();

        return SignedPayload;
    })();

    wrapper.SignedPayloadSet = (function() {

        /**
         * Properties of a SignedPayloadSet.
         * @memberof wrapper
         * @interface ISignedPayloadSet
         * @property {Array.<wrapper.ISignedPayload>|null} [items] SignedPayloadSet items
         */

        /**
         * Constructs a new SignedPayloadSet.
         * @memberof wrapper
         * @classdesc Represents a SignedPayloadSet.
         * @implements ISignedPayloadSet
         * @constructor
         * @param {wrapper.ISignedPayloadSet=} [properties] Properties to set
         */
        function SignedPayloadSet(properties) {
            this.items = [];
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * SignedPayloadSet items.
         * @member {Array.<wrapper.ISignedPayload>} items
         * @memberof wrapper.SignedPayloadSet
         * @instance
         */
        SignedPayloadSet.prototype.items = $util.emptyArray;

        /**
         * Creates a new SignedPayloadSet instance using the specified properties.
         * @function create
         * @memberof wrapper.SignedPayloadSet
         * @static
         * @param {wrapper.ISignedPayloadSet=} [properties] Properties to set
         * @returns {wrapper.SignedPayloadSet} SignedPayloadSet instance
         */
        SignedPayloadSet.create = function create(properties) {
            return new SignedPayloadSet(properties);
        };

        /**
         * Encodes the specified SignedPayloadSet message. Does not implicitly {@link wrapper.SignedPayloadSet.verify|verify} messages.
         * @function encode
         * @memberof wrapper.SignedPayloadSet
         * @static
         * @param {wrapper.ISignedPayloadSet} message SignedPayloadSet message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SignedPayloadSet.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.items != null && message.items.length)
                for (var i = 0; i < message.items.length; ++i)
                    $root.wrapper.SignedPayload.encode(message.items[i], writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified SignedPayloadSet message, length delimited. Does not implicitly {@link wrapper.SignedPayloadSet.verify|verify} messages.
         * @function encodeDelimited
         * @memberof wrapper.SignedPayloadSet
         * @static
         * @param {wrapper.ISignedPayloadSet} message SignedPayloadSet message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SignedPayloadSet.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a SignedPayloadSet message from the specified reader or buffer.
         * @function decode
         * @memberof wrapper.SignedPayloadSet
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {wrapper.SignedPayloadSet} SignedPayloadSet
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SignedPayloadSet.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.wrapper.SignedPayloadSet();
            while (reader.pos < end) {
                var tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        if (!(message.items && message.items.length))
                            message.items = [];
                        message.items.push($root.wrapper.SignedPayload.decode(reader, reader.uint32()));
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a SignedPayloadSet message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof wrapper.SignedPayloadSet
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {wrapper.SignedPayloadSet} SignedPayloadSet
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SignedPayloadSet.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a SignedPayloadSet message.
         * @function verify
         * @memberof wrapper.SignedPayloadSet
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        SignedPayloadSet.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.items != null && message.hasOwnProperty("items")) {
                if (!Array.isArray(message.items))
                    return "items: array expected";
                for (var i = 0; i < message.items.length; ++i) {
                    var error = $root.wrapper.SignedPayload.verify(message.items[i]);
                    if (error)
                        return "items." + error;
                }
            }
            return null;
        };

        /**
         * Creates a SignedPayloadSet message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof wrapper.SignedPayloadSet
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {wrapper.SignedPayloadSet} SignedPayloadSet
         */
        SignedPayloadSet.fromObject = function fromObject(object) {
            if (object instanceof $root.wrapper.SignedPayloadSet)
                return object;
            var message = new $root.wrapper.SignedPayloadSet();
            if (object.items) {
                if (!Array.isArray(object.items))
                    throw TypeError(".wrapper.SignedPayloadSet.items: array expected");
                message.items = [];
                for (var i = 0; i < object.items.length; ++i) {
                    if (typeof object.items[i] !== "object")
                        throw TypeError(".wrapper.SignedPayloadSet.items: object expected");
                    message.items[i] = $root.wrapper.SignedPayload.fromObject(object.items[i]);
                }
            }
            return message;
        };

        /**
         * Creates a plain object from a SignedPayloadSet message. Also converts values to other types if specified.
         * @function toObject
         * @memberof wrapper.SignedPayloadSet
         * @static
         * @param {wrapper.SignedPayloadSet} message SignedPayloadSet
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        SignedPayloadSet.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.arrays || options.defaults)
                object.items = [];
            if (message.items && message.items.length) {
                object.items = [];
                for (var j = 0; j < message.items.length; ++j)
                    object.items[j] = $root.wrapper.SignedPayload.toObject(message.items[j], options);
            }
            return object;
        };

        /**
         * Converts this SignedPayloadSet to JSON.
         * @function toJSON
         * @memberof wrapper.SignedPayloadSet
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        SignedPayloadSet.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for SignedPayloadSet
         * @function getTypeUrl
         * @memberof wrapper.SignedPayloadSet
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        SignedPayloadSet.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/wrapper.SignedPayloadSet";
        };

        return SignedPayloadSet;
    })();

    return wrapper;
})();

$root.filters = (function() {

    /**
     * Namespace filters.
     * @exports filters
     * @namespace
     */
    var filters = {};

    filters.PriceFilter = (function() {

        /**
         * Properties of a PriceFilter.
         * @memberof filters
         * @interface IPriceFilter
         * @property {boolean|null} ["public"] PriceFilter public
         * @property {number|Long|null} [acceptancePrice] PriceFilter acceptancePrice
         * @property {number|Long|null} [notificationPrice] PriceFilter notificationPrice
         */

        /**
         * Constructs a new PriceFilter.
         * @memberof filters
         * @classdesc Represents a PriceFilter.
         * @implements IPriceFilter
         * @constructor
         * @param {filters.IPriceFilter=} [properties] Properties to set
         */
        function PriceFilter(properties) {
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * PriceFilter public.
         * @member {boolean} public
         * @memberof filters.PriceFilter
         * @instance
         */
        PriceFilter.prototype["public"] = false;

        /**
         * PriceFilter acceptancePrice.
         * @member {number|Long} acceptancePrice
         * @memberof filters.PriceFilter
         * @instance
         */
        PriceFilter.prototype.acceptancePrice = $util.Long ? $util.Long.fromBits(0,0,true) : 0;

        /**
         * PriceFilter notificationPrice.
         * @member {number|Long} notificationPrice
         * @memberof filters.PriceFilter
         * @instance
         */
        PriceFilter.prototype.notificationPrice = $util.Long ? $util.Long.fromBits(0,0,true) : 0;

        /**
         * Creates a new PriceFilter instance using the specified properties.
         * @function create
         * @memberof filters.PriceFilter
         * @static
         * @param {filters.IPriceFilter=} [properties] Properties to set
         * @returns {filters.PriceFilter} PriceFilter instance
         */
        PriceFilter.create = function create(properties) {
            return new PriceFilter(properties);
        };

        /**
         * Encodes the specified PriceFilter message. Does not implicitly {@link filters.PriceFilter.verify|verify} messages.
         * @function encode
         * @memberof filters.PriceFilter
         * @static
         * @param {filters.IPriceFilter} message PriceFilter message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PriceFilter.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message["public"] != null && Object.hasOwnProperty.call(message, "public"))
                writer.uint32(/* id 1, wireType 0 =*/8).bool(message["public"]);
            if (message.acceptancePrice != null && Object.hasOwnProperty.call(message, "acceptancePrice"))
                writer.uint32(/* id 2, wireType 0 =*/16).uint64(message.acceptancePrice);
            if (message.notificationPrice != null && Object.hasOwnProperty.call(message, "notificationPrice"))
                writer.uint32(/* id 3, wireType 0 =*/24).uint64(message.notificationPrice);
            return writer;
        };

        /**
         * Encodes the specified PriceFilter message, length delimited. Does not implicitly {@link filters.PriceFilter.verify|verify} messages.
         * @function encodeDelimited
         * @memberof filters.PriceFilter
         * @static
         * @param {filters.IPriceFilter} message PriceFilter message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PriceFilter.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a PriceFilter message from the specified reader or buffer.
         * @function decode
         * @memberof filters.PriceFilter
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {filters.PriceFilter} PriceFilter
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PriceFilter.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.filters.PriceFilter();
            while (reader.pos < end) {
                var tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message["public"] = reader.bool();
                        break;
                    }
                case 2: {
                        message.acceptancePrice = reader.uint64();
                        break;
                    }
                case 3: {
                        message.notificationPrice = reader.uint64();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a PriceFilter message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof filters.PriceFilter
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {filters.PriceFilter} PriceFilter
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PriceFilter.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a PriceFilter message.
         * @function verify
         * @memberof filters.PriceFilter
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        PriceFilter.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message["public"] != null && message.hasOwnProperty("public"))
                if (typeof message["public"] !== "boolean")
                    return "public: boolean expected";
            if (message.acceptancePrice != null && message.hasOwnProperty("acceptancePrice"))
                if (!$util.isInteger(message.acceptancePrice) && !(message.acceptancePrice && $util.isInteger(message.acceptancePrice.low) && $util.isInteger(message.acceptancePrice.high)))
                    return "acceptancePrice: integer|Long expected";
            if (message.notificationPrice != null && message.hasOwnProperty("notificationPrice"))
                if (!$util.isInteger(message.notificationPrice) && !(message.notificationPrice && $util.isInteger(message.notificationPrice.low) && $util.isInteger(message.notificationPrice.high)))
                    return "notificationPrice: integer|Long expected";
            return null;
        };

        /**
         * Creates a PriceFilter message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof filters.PriceFilter
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {filters.PriceFilter} PriceFilter
         */
        PriceFilter.fromObject = function fromObject(object) {
            if (object instanceof $root.filters.PriceFilter)
                return object;
            var message = new $root.filters.PriceFilter();
            if (object["public"] != null)
                message["public"] = Boolean(object["public"]);
            if (object.acceptancePrice != null)
                if ($util.Long)
                    (message.acceptancePrice = $util.Long.fromValue(object.acceptancePrice)).unsigned = true;
                else if (typeof object.acceptancePrice === "string")
                    message.acceptancePrice = parseInt(object.acceptancePrice, 10);
                else if (typeof object.acceptancePrice === "number")
                    message.acceptancePrice = object.acceptancePrice;
                else if (typeof object.acceptancePrice === "object")
                    message.acceptancePrice = new $util.LongBits(object.acceptancePrice.low >>> 0, object.acceptancePrice.high >>> 0).toNumber(true);
            if (object.notificationPrice != null)
                if ($util.Long)
                    (message.notificationPrice = $util.Long.fromValue(object.notificationPrice)).unsigned = true;
                else if (typeof object.notificationPrice === "string")
                    message.notificationPrice = parseInt(object.notificationPrice, 10);
                else if (typeof object.notificationPrice === "number")
                    message.notificationPrice = object.notificationPrice;
                else if (typeof object.notificationPrice === "object")
                    message.notificationPrice = new $util.LongBits(object.notificationPrice.low >>> 0, object.notificationPrice.high >>> 0).toNumber(true);
            return message;
        };

        /**
         * Creates a plain object from a PriceFilter message. Also converts values to other types if specified.
         * @function toObject
         * @memberof filters.PriceFilter
         * @static
         * @param {filters.PriceFilter} message PriceFilter
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        PriceFilter.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.defaults) {
                object["public"] = false;
                if ($util.Long) {
                    var long = new $util.Long(0, 0, true);
                    object.acceptancePrice = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.acceptancePrice = options.longs === String ? "0" : 0;
                if ($util.Long) {
                    var long = new $util.Long(0, 0, true);
                    object.notificationPrice = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.notificationPrice = options.longs === String ? "0" : 0;
            }
            if (message["public"] != null && message.hasOwnProperty("public"))
                object["public"] = message["public"];
            if (message.acceptancePrice != null && message.hasOwnProperty("acceptancePrice"))
                if (typeof message.acceptancePrice === "number")
                    object.acceptancePrice = options.longs === String ? String(message.acceptancePrice) : message.acceptancePrice;
                else
                    object.acceptancePrice = options.longs === String ? $util.Long.prototype.toString.call(message.acceptancePrice) : options.longs === Number ? new $util.LongBits(message.acceptancePrice.low >>> 0, message.acceptancePrice.high >>> 0).toNumber(true) : message.acceptancePrice;
            if (message.notificationPrice != null && message.hasOwnProperty("notificationPrice"))
                if (typeof message.notificationPrice === "number")
                    object.notificationPrice = options.longs === String ? String(message.notificationPrice) : message.notificationPrice;
                else
                    object.notificationPrice = options.longs === String ? $util.Long.prototype.toString.call(message.notificationPrice) : options.longs === Number ? new $util.LongBits(message.notificationPrice.low >>> 0, message.notificationPrice.high >>> 0).toNumber(true) : message.notificationPrice;
            return object;
        };

        /**
         * Converts this PriceFilter to JSON.
         * @function toJSON
         * @memberof filters.PriceFilter
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        PriceFilter.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for PriceFilter
         * @function getTypeUrl
         * @memberof filters.PriceFilter
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        PriceFilter.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/filters.PriceFilter";
        };

        return PriceFilter;
    })();

    filters.Filters = (function() {

        /**
         * Properties of a Filters.
         * @memberof filters
         * @interface IFilters
         * @property {filters.IPriceFilter|null} [priceFilter] Filters priceFilter
         */

        /**
         * Constructs a new Filters.
         * @memberof filters
         * @classdesc Represents a Filters.
         * @implements IFilters
         * @constructor
         * @param {filters.IFilters=} [properties] Properties to set
         */
        function Filters(properties) {
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Filters priceFilter.
         * @member {filters.IPriceFilter|null|undefined} priceFilter
         * @memberof filters.Filters
         * @instance
         */
        Filters.prototype.priceFilter = null;

        /**
         * Creates a new Filters instance using the specified properties.
         * @function create
         * @memberof filters.Filters
         * @static
         * @param {filters.IFilters=} [properties] Properties to set
         * @returns {filters.Filters} Filters instance
         */
        Filters.create = function create(properties) {
            return new Filters(properties);
        };

        /**
         * Encodes the specified Filters message. Does not implicitly {@link filters.Filters.verify|verify} messages.
         * @function encode
         * @memberof filters.Filters
         * @static
         * @param {filters.IFilters} message Filters message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Filters.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.priceFilter != null && Object.hasOwnProperty.call(message, "priceFilter"))
                $root.filters.PriceFilter.encode(message.priceFilter, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified Filters message, length delimited. Does not implicitly {@link filters.Filters.verify|verify} messages.
         * @function encodeDelimited
         * @memberof filters.Filters
         * @static
         * @param {filters.IFilters} message Filters message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Filters.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a Filters message from the specified reader or buffer.
         * @function decode
         * @memberof filters.Filters
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {filters.Filters} Filters
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Filters.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.filters.Filters();
            while (reader.pos < end) {
                var tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.priceFilter = $root.filters.PriceFilter.decode(reader, reader.uint32());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a Filters message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof filters.Filters
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {filters.Filters} Filters
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Filters.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a Filters message.
         * @function verify
         * @memberof filters.Filters
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        Filters.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.priceFilter != null && message.hasOwnProperty("priceFilter")) {
                var error = $root.filters.PriceFilter.verify(message.priceFilter);
                if (error)
                    return "priceFilter." + error;
            }
            return null;
        };

        /**
         * Creates a Filters message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof filters.Filters
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {filters.Filters} Filters
         */
        Filters.fromObject = function fromObject(object) {
            if (object instanceof $root.filters.Filters)
                return object;
            var message = new $root.filters.Filters();
            if (object.priceFilter != null) {
                if (typeof object.priceFilter !== "object")
                    throw TypeError(".filters.Filters.priceFilter: object expected");
                message.priceFilter = $root.filters.PriceFilter.fromObject(object.priceFilter);
            }
            return message;
        };

        /**
         * Creates a plain object from a Filters message. Also converts values to other types if specified.
         * @function toObject
         * @memberof filters.Filters
         * @static
         * @param {filters.Filters} message Filters
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        Filters.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.defaults)
                object.priceFilter = null;
            if (message.priceFilter != null && message.hasOwnProperty("priceFilter"))
                object.priceFilter = $root.filters.PriceFilter.toObject(message.priceFilter, options);
            return object;
        };

        /**
         * Converts this Filters to JSON.
         * @function toJSON
         * @memberof filters.Filters
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        Filters.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for Filters
         * @function getTypeUrl
         * @memberof filters.Filters
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        Filters.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/filters.Filters";
        };

        return Filters;
    })();

    return filters;
})();

$root.p2pkh = (function() {

    /**
     * Namespace p2pkh.
     * @exports p2pkh
     * @namespace
     */
    var p2pkh = {};

    p2pkh.P2PKHEntry = (function() {

        /**
         * Properties of a P2PKHEntry.
         * @memberof p2pkh
         * @interface IP2PKHEntry
         * @property {Uint8Array|null} [transaction] P2PKHEntry transaction
         */

        /**
         * Constructs a new P2PKHEntry.
         * @memberof p2pkh
         * @classdesc Represents a P2PKHEntry.
         * @implements IP2PKHEntry
         * @constructor
         * @param {p2pkh.IP2PKHEntry=} [properties] Properties to set
         */
        function P2PKHEntry(properties) {
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * P2PKHEntry transaction.
         * @member {Uint8Array} transaction
         * @memberof p2pkh.P2PKHEntry
         * @instance
         */
        P2PKHEntry.prototype.transaction = $util.newBuffer([]);

        /**
         * Creates a new P2PKHEntry instance using the specified properties.
         * @function create
         * @memberof p2pkh.P2PKHEntry
         * @static
         * @param {p2pkh.IP2PKHEntry=} [properties] Properties to set
         * @returns {p2pkh.P2PKHEntry} P2PKHEntry instance
         */
        P2PKHEntry.create = function create(properties) {
            return new P2PKHEntry(properties);
        };

        /**
         * Encodes the specified P2PKHEntry message. Does not implicitly {@link p2pkh.P2PKHEntry.verify|verify} messages.
         * @function encode
         * @memberof p2pkh.P2PKHEntry
         * @static
         * @param {p2pkh.IP2PKHEntry} message P2PKHEntry message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        P2PKHEntry.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.transaction != null && Object.hasOwnProperty.call(message, "transaction"))
                writer.uint32(/* id 1, wireType 2 =*/10).bytes(message.transaction);
            return writer;
        };

        /**
         * Encodes the specified P2PKHEntry message, length delimited. Does not implicitly {@link p2pkh.P2PKHEntry.verify|verify} messages.
         * @function encodeDelimited
         * @memberof p2pkh.P2PKHEntry
         * @static
         * @param {p2pkh.IP2PKHEntry} message P2PKHEntry message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        P2PKHEntry.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a P2PKHEntry message from the specified reader or buffer.
         * @function decode
         * @memberof p2pkh.P2PKHEntry
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {p2pkh.P2PKHEntry} P2PKHEntry
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        P2PKHEntry.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.p2pkh.P2PKHEntry();
            while (reader.pos < end) {
                var tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.transaction = reader.bytes();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a P2PKHEntry message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof p2pkh.P2PKHEntry
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {p2pkh.P2PKHEntry} P2PKHEntry
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        P2PKHEntry.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a P2PKHEntry message.
         * @function verify
         * @memberof p2pkh.P2PKHEntry
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        P2PKHEntry.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.transaction != null && message.hasOwnProperty("transaction"))
                if (!(message.transaction && typeof message.transaction.length === "number" || $util.isString(message.transaction)))
                    return "transaction: buffer expected";
            return null;
        };

        /**
         * Creates a P2PKHEntry message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof p2pkh.P2PKHEntry
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {p2pkh.P2PKHEntry} P2PKHEntry
         */
        P2PKHEntry.fromObject = function fromObject(object) {
            if (object instanceof $root.p2pkh.P2PKHEntry)
                return object;
            var message = new $root.p2pkh.P2PKHEntry();
            if (object.transaction != null)
                if (typeof object.transaction === "string")
                    $util.base64.decode(object.transaction, message.transaction = $util.newBuffer($util.base64.length(object.transaction)), 0);
                else if (object.transaction.length >= 0)
                    message.transaction = object.transaction;
            return message;
        };

        /**
         * Creates a plain object from a P2PKHEntry message. Also converts values to other types if specified.
         * @function toObject
         * @memberof p2pkh.P2PKHEntry
         * @static
         * @param {p2pkh.P2PKHEntry} message P2PKHEntry
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        P2PKHEntry.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.defaults)
                if (options.bytes === String)
                    object.transaction = "";
                else {
                    object.transaction = [];
                    if (options.bytes !== Array)
                        object.transaction = $util.newBuffer(object.transaction);
                }
            if (message.transaction != null && message.hasOwnProperty("transaction"))
                object.transaction = options.bytes === String ? $util.base64.encode(message.transaction, 0, message.transaction.length) : options.bytes === Array ? Array.prototype.slice.call(message.transaction) : message.transaction;
            return object;
        };

        /**
         * Converts this P2PKHEntry to JSON.
         * @function toJSON
         * @memberof p2pkh.P2PKHEntry
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        P2PKHEntry.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for P2PKHEntry
         * @function getTypeUrl
         * @memberof p2pkh.P2PKHEntry
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        P2PKHEntry.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/p2pkh.P2PKHEntry";
        };

        return P2PKHEntry;
    })();

    return p2pkh;
})();

$root.broadcast = (function() {

    /**
     * Namespace broadcast.
     * @exports broadcast
     * @namespace
     */
    var broadcast = {};

    broadcast.ForumPost = (function() {

        /**
         * Properties of a ForumPost.
         * @memberof broadcast
         * @interface IForumPost
         * @property {string|null} [title] ForumPost title
         * @property {string|null} [url] ForumPost url
         * @property {string|null} [message] ForumPost message
         */

        /**
         * Constructs a new ForumPost.
         * @memberof broadcast
         * @classdesc Represents a ForumPost.
         * @implements IForumPost
         * @constructor
         * @param {broadcast.IForumPost=} [properties] Properties to set
         */
        function ForumPost(properties) {
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * ForumPost title.
         * @member {string} title
         * @memberof broadcast.ForumPost
         * @instance
         */
        ForumPost.prototype.title = "";

        /**
         * ForumPost url.
         * @member {string} url
         * @memberof broadcast.ForumPost
         * @instance
         */
        ForumPost.prototype.url = "";

        /**
         * ForumPost message.
         * @member {string} message
         * @memberof broadcast.ForumPost
         * @instance
         */
        ForumPost.prototype.message = "";

        /**
         * Creates a new ForumPost instance using the specified properties.
         * @function create
         * @memberof broadcast.ForumPost
         * @static
         * @param {broadcast.IForumPost=} [properties] Properties to set
         * @returns {broadcast.ForumPost} ForumPost instance
         */
        ForumPost.create = function create(properties) {
            return new ForumPost(properties);
        };

        /**
         * Encodes the specified ForumPost message. Does not implicitly {@link broadcast.ForumPost.verify|verify} messages.
         * @function encode
         * @memberof broadcast.ForumPost
         * @static
         * @param {broadcast.IForumPost} message ForumPost message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ForumPost.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.title != null && Object.hasOwnProperty.call(message, "title"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.title);
            if (message.url != null && Object.hasOwnProperty.call(message, "url"))
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.url);
            if (message.message != null && Object.hasOwnProperty.call(message, "message"))
                writer.uint32(/* id 3, wireType 2 =*/26).string(message.message);
            return writer;
        };

        /**
         * Encodes the specified ForumPost message, length delimited. Does not implicitly {@link broadcast.ForumPost.verify|verify} messages.
         * @function encodeDelimited
         * @memberof broadcast.ForumPost
         * @static
         * @param {broadcast.IForumPost} message ForumPost message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ForumPost.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a ForumPost message from the specified reader or buffer.
         * @function decode
         * @memberof broadcast.ForumPost
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {broadcast.ForumPost} ForumPost
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ForumPost.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.broadcast.ForumPost();
            while (reader.pos < end) {
                var tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.title = reader.string();
                        break;
                    }
                case 2: {
                        message.url = reader.string();
                        break;
                    }
                case 3: {
                        message.message = reader.string();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a ForumPost message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof broadcast.ForumPost
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {broadcast.ForumPost} ForumPost
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ForumPost.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a ForumPost message.
         * @function verify
         * @memberof broadcast.ForumPost
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        ForumPost.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.title != null && message.hasOwnProperty("title"))
                if (!$util.isString(message.title))
                    return "title: string expected";
            if (message.url != null && message.hasOwnProperty("url"))
                if (!$util.isString(message.url))
                    return "url: string expected";
            if (message.message != null && message.hasOwnProperty("message"))
                if (!$util.isString(message.message))
                    return "message: string expected";
            return null;
        };

        /**
         * Creates a ForumPost message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof broadcast.ForumPost
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {broadcast.ForumPost} ForumPost
         */
        ForumPost.fromObject = function fromObject(object) {
            if (object instanceof $root.broadcast.ForumPost)
                return object;
            var message = new $root.broadcast.ForumPost();
            if (object.title != null)
                message.title = String(object.title);
            if (object.url != null)
                message.url = String(object.url);
            if (object.message != null)
                message.message = String(object.message);
            return message;
        };

        /**
         * Creates a plain object from a ForumPost message. Also converts values to other types if specified.
         * @function toObject
         * @memberof broadcast.ForumPost
         * @static
         * @param {broadcast.ForumPost} message ForumPost
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        ForumPost.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.defaults) {
                object.title = "";
                object.url = "";
                object.message = "";
            }
            if (message.title != null && message.hasOwnProperty("title"))
                object.title = message.title;
            if (message.url != null && message.hasOwnProperty("url"))
                object.url = message.url;
            if (message.message != null && message.hasOwnProperty("message"))
                object.message = message.message;
            return object;
        };

        /**
         * Converts this ForumPost to JSON.
         * @function toJSON
         * @memberof broadcast.ForumPost
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        ForumPost.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for ForumPost
         * @function getTypeUrl
         * @memberof broadcast.ForumPost
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        ForumPost.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/broadcast.ForumPost";
        };

        return ForumPost;
    })();

    broadcast.BroadcastEntry = (function() {

        /**
         * Properties of a BroadcastEntry.
         * @memberof broadcast
         * @interface IBroadcastEntry
         * @property {string|null} [kind] BroadcastEntry kind
         * @property {Object.<string,string>|null} [headers] BroadcastEntry headers
         * @property {Uint8Array|null} [payload] BroadcastEntry payload
         */

        /**
         * Constructs a new BroadcastEntry.
         * @memberof broadcast
         * @classdesc Represents a BroadcastEntry.
         * @implements IBroadcastEntry
         * @constructor
         * @param {broadcast.IBroadcastEntry=} [properties] Properties to set
         */
        function BroadcastEntry(properties) {
            this.headers = {};
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * BroadcastEntry kind.
         * @member {string} kind
         * @memberof broadcast.BroadcastEntry
         * @instance
         */
        BroadcastEntry.prototype.kind = "";

        /**
         * BroadcastEntry headers.
         * @member {Object.<string,string>} headers
         * @memberof broadcast.BroadcastEntry
         * @instance
         */
        BroadcastEntry.prototype.headers = $util.emptyObject;

        /**
         * BroadcastEntry payload.
         * @member {Uint8Array} payload
         * @memberof broadcast.BroadcastEntry
         * @instance
         */
        BroadcastEntry.prototype.payload = $util.newBuffer([]);

        /**
         * Creates a new BroadcastEntry instance using the specified properties.
         * @function create
         * @memberof broadcast.BroadcastEntry
         * @static
         * @param {broadcast.IBroadcastEntry=} [properties] Properties to set
         * @returns {broadcast.BroadcastEntry} BroadcastEntry instance
         */
        BroadcastEntry.create = function create(properties) {
            return new BroadcastEntry(properties);
        };

        /**
         * Encodes the specified BroadcastEntry message. Does not implicitly {@link broadcast.BroadcastEntry.verify|verify} messages.
         * @function encode
         * @memberof broadcast.BroadcastEntry
         * @static
         * @param {broadcast.IBroadcastEntry} message BroadcastEntry message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        BroadcastEntry.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.kind != null && Object.hasOwnProperty.call(message, "kind"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.kind);
            if (message.headers != null && Object.hasOwnProperty.call(message, "headers"))
                for (var keys = Object.keys(message.headers), i = 0; i < keys.length; ++i)
                    writer.uint32(/* id 2, wireType 2 =*/18).fork().uint32(/* id 1, wireType 2 =*/10).string(keys[i]).uint32(/* id 2, wireType 2 =*/18).string(message.headers[keys[i]]).ldelim();
            if (message.payload != null && Object.hasOwnProperty.call(message, "payload"))
                writer.uint32(/* id 3, wireType 2 =*/26).bytes(message.payload);
            return writer;
        };

        /**
         * Encodes the specified BroadcastEntry message, length delimited. Does not implicitly {@link broadcast.BroadcastEntry.verify|verify} messages.
         * @function encodeDelimited
         * @memberof broadcast.BroadcastEntry
         * @static
         * @param {broadcast.IBroadcastEntry} message BroadcastEntry message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        BroadcastEntry.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a BroadcastEntry message from the specified reader or buffer.
         * @function decode
         * @memberof broadcast.BroadcastEntry
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {broadcast.BroadcastEntry} BroadcastEntry
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        BroadcastEntry.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.broadcast.BroadcastEntry(), key, value;
            while (reader.pos < end) {
                var tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.kind = reader.string();
                        break;
                    }
                case 2: {
                        if (message.headers === $util.emptyObject)
                            message.headers = {};
                        var end2 = reader.uint32() + reader.pos;
                        key = "";
                        value = "";
                        while (reader.pos < end2) {
                            var tag2 = reader.uint32();
                            switch (tag2 >>> 3) {
                            case 1:
                                key = reader.string();
                                break;
                            case 2:
                                value = reader.string();
                                break;
                            default:
                                reader.skipType(tag2 & 7);
                                break;
                            }
                        }
                        message.headers[key] = value;
                        break;
                    }
                case 3: {
                        message.payload = reader.bytes();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a BroadcastEntry message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof broadcast.BroadcastEntry
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {broadcast.BroadcastEntry} BroadcastEntry
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        BroadcastEntry.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a BroadcastEntry message.
         * @function verify
         * @memberof broadcast.BroadcastEntry
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        BroadcastEntry.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.kind != null && message.hasOwnProperty("kind"))
                if (!$util.isString(message.kind))
                    return "kind: string expected";
            if (message.headers != null && message.hasOwnProperty("headers")) {
                if (!$util.isObject(message.headers))
                    return "headers: object expected";
                var key = Object.keys(message.headers);
                for (var i = 0; i < key.length; ++i)
                    if (!$util.isString(message.headers[key[i]]))
                        return "headers: string{k:string} expected";
            }
            if (message.payload != null && message.hasOwnProperty("payload"))
                if (!(message.payload && typeof message.payload.length === "number" || $util.isString(message.payload)))
                    return "payload: buffer expected";
            return null;
        };

        /**
         * Creates a BroadcastEntry message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof broadcast.BroadcastEntry
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {broadcast.BroadcastEntry} BroadcastEntry
         */
        BroadcastEntry.fromObject = function fromObject(object) {
            if (object instanceof $root.broadcast.BroadcastEntry)
                return object;
            var message = new $root.broadcast.BroadcastEntry();
            if (object.kind != null)
                message.kind = String(object.kind);
            if (object.headers) {
                if (typeof object.headers !== "object")
                    throw TypeError(".broadcast.BroadcastEntry.headers: object expected");
                message.headers = {};
                for (var keys = Object.keys(object.headers), i = 0; i < keys.length; ++i)
                    message.headers[keys[i]] = String(object.headers[keys[i]]);
            }
            if (object.payload != null)
                if (typeof object.payload === "string")
                    $util.base64.decode(object.payload, message.payload = $util.newBuffer($util.base64.length(object.payload)), 0);
                else if (object.payload.length >= 0)
                    message.payload = object.payload;
            return message;
        };

        /**
         * Creates a plain object from a BroadcastEntry message. Also converts values to other types if specified.
         * @function toObject
         * @memberof broadcast.BroadcastEntry
         * @static
         * @param {broadcast.BroadcastEntry} message BroadcastEntry
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        BroadcastEntry.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.objects || options.defaults)
                object.headers = {};
            if (options.defaults) {
                object.kind = "";
                if (options.bytes === String)
                    object.payload = "";
                else {
                    object.payload = [];
                    if (options.bytes !== Array)
                        object.payload = $util.newBuffer(object.payload);
                }
            }
            if (message.kind != null && message.hasOwnProperty("kind"))
                object.kind = message.kind;
            var keys2;
            if (message.headers && (keys2 = Object.keys(message.headers)).length) {
                object.headers = {};
                for (var j = 0; j < keys2.length; ++j)
                    object.headers[keys2[j]] = message.headers[keys2[j]];
            }
            if (message.payload != null && message.hasOwnProperty("payload"))
                object.payload = options.bytes === String ? $util.base64.encode(message.payload, 0, message.payload.length) : options.bytes === Array ? Array.prototype.slice.call(message.payload) : message.payload;
            return object;
        };

        /**
         * Converts this BroadcastEntry to JSON.
         * @function toJSON
         * @memberof broadcast.BroadcastEntry
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        BroadcastEntry.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for BroadcastEntry
         * @function getTypeUrl
         * @memberof broadcast.BroadcastEntry
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        BroadcastEntry.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/broadcast.BroadcastEntry";
        };

        return BroadcastEntry;
    })();

    broadcast.BroadcastMessage = (function() {

        /**
         * Properties of a BroadcastMessage.
         * @memberof broadcast
         * @interface IBroadcastMessage
         * @property {string|null} [topic] BroadcastMessage topic
         * @property {number|Long|null} [timestamp] BroadcastMessage timestamp
         * @property {Array.<broadcast.IBroadcastEntry>|null} [entries] BroadcastMessage entries
         * @property {Uint8Array|null} [parentDigest] BroadcastMessage parentDigest
         */

        /**
         * Constructs a new BroadcastMessage.
         * @memberof broadcast
         * @classdesc Represents a BroadcastMessage.
         * @implements IBroadcastMessage
         * @constructor
         * @param {broadcast.IBroadcastMessage=} [properties] Properties to set
         */
        function BroadcastMessage(properties) {
            this.entries = [];
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * BroadcastMessage topic.
         * @member {string} topic
         * @memberof broadcast.BroadcastMessage
         * @instance
         */
        BroadcastMessage.prototype.topic = "";

        /**
         * BroadcastMessage timestamp.
         * @member {number|Long} timestamp
         * @memberof broadcast.BroadcastMessage
         * @instance
         */
        BroadcastMessage.prototype.timestamp = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * BroadcastMessage entries.
         * @member {Array.<broadcast.IBroadcastEntry>} entries
         * @memberof broadcast.BroadcastMessage
         * @instance
         */
        BroadcastMessage.prototype.entries = $util.emptyArray;

        /**
         * BroadcastMessage parentDigest.
         * @member {Uint8Array} parentDigest
         * @memberof broadcast.BroadcastMessage
         * @instance
         */
        BroadcastMessage.prototype.parentDigest = $util.newBuffer([]);

        /**
         * Creates a new BroadcastMessage instance using the specified properties.
         * @function create
         * @memberof broadcast.BroadcastMessage
         * @static
         * @param {broadcast.IBroadcastMessage=} [properties] Properties to set
         * @returns {broadcast.BroadcastMessage} BroadcastMessage instance
         */
        BroadcastMessage.create = function create(properties) {
            return new BroadcastMessage(properties);
        };

        /**
         * Encodes the specified BroadcastMessage message. Does not implicitly {@link broadcast.BroadcastMessage.verify|verify} messages.
         * @function encode
         * @memberof broadcast.BroadcastMessage
         * @static
         * @param {broadcast.IBroadcastMessage} message BroadcastMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        BroadcastMessage.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.topic != null && Object.hasOwnProperty.call(message, "topic"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.topic);
            if (message.timestamp != null && Object.hasOwnProperty.call(message, "timestamp"))
                writer.uint32(/* id 2, wireType 0 =*/16).int64(message.timestamp);
            if (message.entries != null && message.entries.length)
                for (var i = 0; i < message.entries.length; ++i)
                    $root.broadcast.BroadcastEntry.encode(message.entries[i], writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
            if (message.parentDigest != null && Object.hasOwnProperty.call(message, "parentDigest"))
                writer.uint32(/* id 4, wireType 2 =*/34).bytes(message.parentDigest);
            return writer;
        };

        /**
         * Encodes the specified BroadcastMessage message, length delimited. Does not implicitly {@link broadcast.BroadcastMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof broadcast.BroadcastMessage
         * @static
         * @param {broadcast.IBroadcastMessage} message BroadcastMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        BroadcastMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a BroadcastMessage message from the specified reader or buffer.
         * @function decode
         * @memberof broadcast.BroadcastMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {broadcast.BroadcastMessage} BroadcastMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        BroadcastMessage.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.broadcast.BroadcastMessage();
            while (reader.pos < end) {
                var tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.topic = reader.string();
                        break;
                    }
                case 2: {
                        message.timestamp = reader.int64();
                        break;
                    }
                case 3: {
                        if (!(message.entries && message.entries.length))
                            message.entries = [];
                        message.entries.push($root.broadcast.BroadcastEntry.decode(reader, reader.uint32()));
                        break;
                    }
                case 4: {
                        message.parentDigest = reader.bytes();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a BroadcastMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof broadcast.BroadcastMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {broadcast.BroadcastMessage} BroadcastMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        BroadcastMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a BroadcastMessage message.
         * @function verify
         * @memberof broadcast.BroadcastMessage
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        BroadcastMessage.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.topic != null && message.hasOwnProperty("topic"))
                if (!$util.isString(message.topic))
                    return "topic: string expected";
            if (message.timestamp != null && message.hasOwnProperty("timestamp"))
                if (!$util.isInteger(message.timestamp) && !(message.timestamp && $util.isInteger(message.timestamp.low) && $util.isInteger(message.timestamp.high)))
                    return "timestamp: integer|Long expected";
            if (message.entries != null && message.hasOwnProperty("entries")) {
                if (!Array.isArray(message.entries))
                    return "entries: array expected";
                for (var i = 0; i < message.entries.length; ++i) {
                    var error = $root.broadcast.BroadcastEntry.verify(message.entries[i]);
                    if (error)
                        return "entries." + error;
                }
            }
            if (message.parentDigest != null && message.hasOwnProperty("parentDigest"))
                if (!(message.parentDigest && typeof message.parentDigest.length === "number" || $util.isString(message.parentDigest)))
                    return "parentDigest: buffer expected";
            return null;
        };

        /**
         * Creates a BroadcastMessage message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof broadcast.BroadcastMessage
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {broadcast.BroadcastMessage} BroadcastMessage
         */
        BroadcastMessage.fromObject = function fromObject(object) {
            if (object instanceof $root.broadcast.BroadcastMessage)
                return object;
            var message = new $root.broadcast.BroadcastMessage();
            if (object.topic != null)
                message.topic = String(object.topic);
            if (object.timestamp != null)
                if ($util.Long)
                    (message.timestamp = $util.Long.fromValue(object.timestamp)).unsigned = false;
                else if (typeof object.timestamp === "string")
                    message.timestamp = parseInt(object.timestamp, 10);
                else if (typeof object.timestamp === "number")
                    message.timestamp = object.timestamp;
                else if (typeof object.timestamp === "object")
                    message.timestamp = new $util.LongBits(object.timestamp.low >>> 0, object.timestamp.high >>> 0).toNumber();
            if (object.entries) {
                if (!Array.isArray(object.entries))
                    throw TypeError(".broadcast.BroadcastMessage.entries: array expected");
                message.entries = [];
                for (var i = 0; i < object.entries.length; ++i) {
                    if (typeof object.entries[i] !== "object")
                        throw TypeError(".broadcast.BroadcastMessage.entries: object expected");
                    message.entries[i] = $root.broadcast.BroadcastEntry.fromObject(object.entries[i]);
                }
            }
            if (object.parentDigest != null)
                if (typeof object.parentDigest === "string")
                    $util.base64.decode(object.parentDigest, message.parentDigest = $util.newBuffer($util.base64.length(object.parentDigest)), 0);
                else if (object.parentDigest.length >= 0)
                    message.parentDigest = object.parentDigest;
            return message;
        };

        /**
         * Creates a plain object from a BroadcastMessage message. Also converts values to other types if specified.
         * @function toObject
         * @memberof broadcast.BroadcastMessage
         * @static
         * @param {broadcast.BroadcastMessage} message BroadcastMessage
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        BroadcastMessage.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.arrays || options.defaults)
                object.entries = [];
            if (options.defaults) {
                object.topic = "";
                if ($util.Long) {
                    var long = new $util.Long(0, 0, false);
                    object.timestamp = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.timestamp = options.longs === String ? "0" : 0;
                if (options.bytes === String)
                    object.parentDigest = "";
                else {
                    object.parentDigest = [];
                    if (options.bytes !== Array)
                        object.parentDigest = $util.newBuffer(object.parentDigest);
                }
            }
            if (message.topic != null && message.hasOwnProperty("topic"))
                object.topic = message.topic;
            if (message.timestamp != null && message.hasOwnProperty("timestamp"))
                if (typeof message.timestamp === "number")
                    object.timestamp = options.longs === String ? String(message.timestamp) : message.timestamp;
                else
                    object.timestamp = options.longs === String ? $util.Long.prototype.toString.call(message.timestamp) : options.longs === Number ? new $util.LongBits(message.timestamp.low >>> 0, message.timestamp.high >>> 0).toNumber() : message.timestamp;
            if (message.entries && message.entries.length) {
                object.entries = [];
                for (var j = 0; j < message.entries.length; ++j)
                    object.entries[j] = $root.broadcast.BroadcastEntry.toObject(message.entries[j], options);
            }
            if (message.parentDigest != null && message.hasOwnProperty("parentDigest"))
                object.parentDigest = options.bytes === String ? $util.base64.encode(message.parentDigest, 0, message.parentDigest.length) : options.bytes === Array ? Array.prototype.slice.call(message.parentDigest) : message.parentDigest;
            return object;
        };

        /**
         * Converts this BroadcastMessage to JSON.
         * @function toJSON
         * @memberof broadcast.BroadcastMessage
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        BroadcastMessage.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for BroadcastMessage
         * @function getTypeUrl
         * @memberof broadcast.BroadcastMessage
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        BroadcastMessage.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/broadcast.BroadcastMessage";
        };

        return BroadcastMessage;
    })();

    return broadcast;
})();

$root.bip70 = (function() {

    /**
     * Namespace bip70.
     * @exports bip70
     * @namespace
     */
    var bip70 = {};

    bip70.Output = (function() {

        /**
         * Properties of an Output.
         * @memberof bip70
         * @interface IOutput
         * @property {number|Long|null} [amount] Output amount
         * @property {Uint8Array} script Output script
         */

        /**
         * Constructs a new Output.
         * @memberof bip70
         * @classdesc Represents an Output.
         * @implements IOutput
         * @constructor
         * @param {bip70.IOutput=} [properties] Properties to set
         */
        function Output(properties) {
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Output amount.
         * @member {number|Long} amount
         * @memberof bip70.Output
         * @instance
         */
        Output.prototype.amount = $util.Long ? $util.Long.fromBits(0,0,true) : 0;

        /**
         * Output script.
         * @member {Uint8Array} script
         * @memberof bip70.Output
         * @instance
         */
        Output.prototype.script = $util.newBuffer([]);

        /**
         * Creates a new Output instance using the specified properties.
         * @function create
         * @memberof bip70.Output
         * @static
         * @param {bip70.IOutput=} [properties] Properties to set
         * @returns {bip70.Output} Output instance
         */
        Output.create = function create(properties) {
            return new Output(properties);
        };

        /**
         * Encodes the specified Output message. Does not implicitly {@link bip70.Output.verify|verify} messages.
         * @function encode
         * @memberof bip70.Output
         * @static
         * @param {bip70.IOutput} message Output message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Output.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.amount != null && Object.hasOwnProperty.call(message, "amount"))
                writer.uint32(/* id 1, wireType 0 =*/8).uint64(message.amount);
            writer.uint32(/* id 2, wireType 2 =*/18).bytes(message.script);
            return writer;
        };

        /**
         * Encodes the specified Output message, length delimited. Does not implicitly {@link bip70.Output.verify|verify} messages.
         * @function encodeDelimited
         * @memberof bip70.Output
         * @static
         * @param {bip70.IOutput} message Output message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Output.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes an Output message from the specified reader or buffer.
         * @function decode
         * @memberof bip70.Output
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {bip70.Output} Output
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Output.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.bip70.Output();
            while (reader.pos < end) {
                var tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.amount = reader.uint64();
                        break;
                    }
                case 2: {
                        message.script = reader.bytes();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            if (!message.hasOwnProperty("script"))
                throw $util.ProtocolError("missing required 'script'", { instance: message });
            return message;
        };

        /**
         * Decodes an Output message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof bip70.Output
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {bip70.Output} Output
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Output.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies an Output message.
         * @function verify
         * @memberof bip70.Output
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        Output.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.amount != null && message.hasOwnProperty("amount"))
                if (!$util.isInteger(message.amount) && !(message.amount && $util.isInteger(message.amount.low) && $util.isInteger(message.amount.high)))
                    return "amount: integer|Long expected";
            if (!(message.script && typeof message.script.length === "number" || $util.isString(message.script)))
                return "script: buffer expected";
            return null;
        };

        /**
         * Creates an Output message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof bip70.Output
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {bip70.Output} Output
         */
        Output.fromObject = function fromObject(object) {
            if (object instanceof $root.bip70.Output)
                return object;
            var message = new $root.bip70.Output();
            if (object.amount != null)
                if ($util.Long)
                    (message.amount = $util.Long.fromValue(object.amount)).unsigned = true;
                else if (typeof object.amount === "string")
                    message.amount = parseInt(object.amount, 10);
                else if (typeof object.amount === "number")
                    message.amount = object.amount;
                else if (typeof object.amount === "object")
                    message.amount = new $util.LongBits(object.amount.low >>> 0, object.amount.high >>> 0).toNumber(true);
            if (object.script != null)
                if (typeof object.script === "string")
                    $util.base64.decode(object.script, message.script = $util.newBuffer($util.base64.length(object.script)), 0);
                else if (object.script.length >= 0)
                    message.script = object.script;
            return message;
        };

        /**
         * Creates a plain object from an Output message. Also converts values to other types if specified.
         * @function toObject
         * @memberof bip70.Output
         * @static
         * @param {bip70.Output} message Output
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        Output.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.defaults) {
                if ($util.Long) {
                    var long = new $util.Long(0, 0, true);
                    object.amount = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.amount = options.longs === String ? "0" : 0;
                if (options.bytes === String)
                    object.script = "";
                else {
                    object.script = [];
                    if (options.bytes !== Array)
                        object.script = $util.newBuffer(object.script);
                }
            }
            if (message.amount != null && message.hasOwnProperty("amount"))
                if (typeof message.amount === "number")
                    object.amount = options.longs === String ? String(message.amount) : message.amount;
                else
                    object.amount = options.longs === String ? $util.Long.prototype.toString.call(message.amount) : options.longs === Number ? new $util.LongBits(message.amount.low >>> 0, message.amount.high >>> 0).toNumber(true) : message.amount;
            if (message.script != null && message.hasOwnProperty("script"))
                object.script = options.bytes === String ? $util.base64.encode(message.script, 0, message.script.length) : options.bytes === Array ? Array.prototype.slice.call(message.script) : message.script;
            return object;
        };

        /**
         * Converts this Output to JSON.
         * @function toJSON
         * @memberof bip70.Output
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        Output.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for Output
         * @function getTypeUrl
         * @memberof bip70.Output
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        Output.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/bip70.Output";
        };

        return Output;
    })();

    bip70.PaymentDetails = (function() {

        /**
         * Properties of a PaymentDetails.
         * @memberof bip70
         * @interface IPaymentDetails
         * @property {string|null} [network] PaymentDetails network
         * @property {Array.<bip70.IOutput>|null} [outputs] PaymentDetails outputs
         * @property {number|Long} time PaymentDetails time
         * @property {number|Long|null} [expires] PaymentDetails expires
         * @property {string|null} [memo] PaymentDetails memo
         * @property {string|null} [paymentUrl] PaymentDetails paymentUrl
         * @property {Uint8Array|null} [merchantData] PaymentDetails merchantData
         */

        /**
         * Constructs a new PaymentDetails.
         * @memberof bip70
         * @classdesc Represents a PaymentDetails.
         * @implements IPaymentDetails
         * @constructor
         * @param {bip70.IPaymentDetails=} [properties] Properties to set
         */
        function PaymentDetails(properties) {
            this.outputs = [];
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * PaymentDetails network.
         * @member {string} network
         * @memberof bip70.PaymentDetails
         * @instance
         */
        PaymentDetails.prototype.network = "main";

        /**
         * PaymentDetails outputs.
         * @member {Array.<bip70.IOutput>} outputs
         * @memberof bip70.PaymentDetails
         * @instance
         */
        PaymentDetails.prototype.outputs = $util.emptyArray;

        /**
         * PaymentDetails time.
         * @member {number|Long} time
         * @memberof bip70.PaymentDetails
         * @instance
         */
        PaymentDetails.prototype.time = $util.Long ? $util.Long.fromBits(0,0,true) : 0;

        /**
         * PaymentDetails expires.
         * @member {number|Long} expires
         * @memberof bip70.PaymentDetails
         * @instance
         */
        PaymentDetails.prototype.expires = $util.Long ? $util.Long.fromBits(0,0,true) : 0;

        /**
         * PaymentDetails memo.
         * @member {string} memo
         * @memberof bip70.PaymentDetails
         * @instance
         */
        PaymentDetails.prototype.memo = "";

        /**
         * PaymentDetails paymentUrl.
         * @member {string} paymentUrl
         * @memberof bip70.PaymentDetails
         * @instance
         */
        PaymentDetails.prototype.paymentUrl = "";

        /**
         * PaymentDetails merchantData.
         * @member {Uint8Array} merchantData
         * @memberof bip70.PaymentDetails
         * @instance
         */
        PaymentDetails.prototype.merchantData = $util.newBuffer([]);

        /**
         * Creates a new PaymentDetails instance using the specified properties.
         * @function create
         * @memberof bip70.PaymentDetails
         * @static
         * @param {bip70.IPaymentDetails=} [properties] Properties to set
         * @returns {bip70.PaymentDetails} PaymentDetails instance
         */
        PaymentDetails.create = function create(properties) {
            return new PaymentDetails(properties);
        };

        /**
         * Encodes the specified PaymentDetails message. Does not implicitly {@link bip70.PaymentDetails.verify|verify} messages.
         * @function encode
         * @memberof bip70.PaymentDetails
         * @static
         * @param {bip70.IPaymentDetails} message PaymentDetails message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PaymentDetails.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.network != null && Object.hasOwnProperty.call(message, "network"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.network);
            if (message.outputs != null && message.outputs.length)
                for (var i = 0; i < message.outputs.length; ++i)
                    $root.bip70.Output.encode(message.outputs[i], writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
            writer.uint32(/* id 3, wireType 0 =*/24).uint64(message.time);
            if (message.expires != null && Object.hasOwnProperty.call(message, "expires"))
                writer.uint32(/* id 4, wireType 0 =*/32).uint64(message.expires);
            if (message.memo != null && Object.hasOwnProperty.call(message, "memo"))
                writer.uint32(/* id 5, wireType 2 =*/42).string(message.memo);
            if (message.paymentUrl != null && Object.hasOwnProperty.call(message, "paymentUrl"))
                writer.uint32(/* id 6, wireType 2 =*/50).string(message.paymentUrl);
            if (message.merchantData != null && Object.hasOwnProperty.call(message, "merchantData"))
                writer.uint32(/* id 7, wireType 2 =*/58).bytes(message.merchantData);
            return writer;
        };

        /**
         * Encodes the specified PaymentDetails message, length delimited. Does not implicitly {@link bip70.PaymentDetails.verify|verify} messages.
         * @function encodeDelimited
         * @memberof bip70.PaymentDetails
         * @static
         * @param {bip70.IPaymentDetails} message PaymentDetails message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PaymentDetails.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a PaymentDetails message from the specified reader or buffer.
         * @function decode
         * @memberof bip70.PaymentDetails
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {bip70.PaymentDetails} PaymentDetails
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PaymentDetails.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.bip70.PaymentDetails();
            while (reader.pos < end) {
                var tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.network = reader.string();
                        break;
                    }
                case 2: {
                        if (!(message.outputs && message.outputs.length))
                            message.outputs = [];
                        message.outputs.push($root.bip70.Output.decode(reader, reader.uint32()));
                        break;
                    }
                case 3: {
                        message.time = reader.uint64();
                        break;
                    }
                case 4: {
                        message.expires = reader.uint64();
                        break;
                    }
                case 5: {
                        message.memo = reader.string();
                        break;
                    }
                case 6: {
                        message.paymentUrl = reader.string();
                        break;
                    }
                case 7: {
                        message.merchantData = reader.bytes();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            if (!message.hasOwnProperty("time"))
                throw $util.ProtocolError("missing required 'time'", { instance: message });
            return message;
        };

        /**
         * Decodes a PaymentDetails message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof bip70.PaymentDetails
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {bip70.PaymentDetails} PaymentDetails
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PaymentDetails.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a PaymentDetails message.
         * @function verify
         * @memberof bip70.PaymentDetails
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        PaymentDetails.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.network != null && message.hasOwnProperty("network"))
                if (!$util.isString(message.network))
                    return "network: string expected";
            if (message.outputs != null && message.hasOwnProperty("outputs")) {
                if (!Array.isArray(message.outputs))
                    return "outputs: array expected";
                for (var i = 0; i < message.outputs.length; ++i) {
                    var error = $root.bip70.Output.verify(message.outputs[i]);
                    if (error)
                        return "outputs." + error;
                }
            }
            if (!$util.isInteger(message.time) && !(message.time && $util.isInteger(message.time.low) && $util.isInteger(message.time.high)))
                return "time: integer|Long expected";
            if (message.expires != null && message.hasOwnProperty("expires"))
                if (!$util.isInteger(message.expires) && !(message.expires && $util.isInteger(message.expires.low) && $util.isInteger(message.expires.high)))
                    return "expires: integer|Long expected";
            if (message.memo != null && message.hasOwnProperty("memo"))
                if (!$util.isString(message.memo))
                    return "memo: string expected";
            if (message.paymentUrl != null && message.hasOwnProperty("paymentUrl"))
                if (!$util.isString(message.paymentUrl))
                    return "paymentUrl: string expected";
            if (message.merchantData != null && message.hasOwnProperty("merchantData"))
                if (!(message.merchantData && typeof message.merchantData.length === "number" || $util.isString(message.merchantData)))
                    return "merchantData: buffer expected";
            return null;
        };

        /**
         * Creates a PaymentDetails message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof bip70.PaymentDetails
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {bip70.PaymentDetails} PaymentDetails
         */
        PaymentDetails.fromObject = function fromObject(object) {
            if (object instanceof $root.bip70.PaymentDetails)
                return object;
            var message = new $root.bip70.PaymentDetails();
            if (object.network != null)
                message.network = String(object.network);
            if (object.outputs) {
                if (!Array.isArray(object.outputs))
                    throw TypeError(".bip70.PaymentDetails.outputs: array expected");
                message.outputs = [];
                for (var i = 0; i < object.outputs.length; ++i) {
                    if (typeof object.outputs[i] !== "object")
                        throw TypeError(".bip70.PaymentDetails.outputs: object expected");
                    message.outputs[i] = $root.bip70.Output.fromObject(object.outputs[i]);
                }
            }
            if (object.time != null)
                if ($util.Long)
                    (message.time = $util.Long.fromValue(object.time)).unsigned = true;
                else if (typeof object.time === "string")
                    message.time = parseInt(object.time, 10);
                else if (typeof object.time === "number")
                    message.time = object.time;
                else if (typeof object.time === "object")
                    message.time = new $util.LongBits(object.time.low >>> 0, object.time.high >>> 0).toNumber(true);
            if (object.expires != null)
                if ($util.Long)
                    (message.expires = $util.Long.fromValue(object.expires)).unsigned = true;
                else if (typeof object.expires === "string")
                    message.expires = parseInt(object.expires, 10);
                else if (typeof object.expires === "number")
                    message.expires = object.expires;
                else if (typeof object.expires === "object")
                    message.expires = new $util.LongBits(object.expires.low >>> 0, object.expires.high >>> 0).toNumber(true);
            if (object.memo != null)
                message.memo = String(object.memo);
            if (object.paymentUrl != null)
                message.paymentUrl = String(object.paymentUrl);
            if (object.merchantData != null)
                if (typeof object.merchantData === "string")
                    $util.base64.decode(object.merchantData, message.merchantData = $util.newBuffer($util.base64.length(object.merchantData)), 0);
                else if (object.merchantData.length >= 0)
                    message.merchantData = object.merchantData;
            return message;
        };

        /**
         * Creates a plain object from a PaymentDetails message. Also converts values to other types if specified.
         * @function toObject
         * @memberof bip70.PaymentDetails
         * @static
         * @param {bip70.PaymentDetails} message PaymentDetails
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        PaymentDetails.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.arrays || options.defaults)
                object.outputs = [];
            if (options.defaults) {
                object.network = "main";
                if ($util.Long) {
                    var long = new $util.Long(0, 0, true);
                    object.time = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.time = options.longs === String ? "0" : 0;
                if ($util.Long) {
                    var long = new $util.Long(0, 0, true);
                    object.expires = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.expires = options.longs === String ? "0" : 0;
                object.memo = "";
                object.paymentUrl = "";
                if (options.bytes === String)
                    object.merchantData = "";
                else {
                    object.merchantData = [];
                    if (options.bytes !== Array)
                        object.merchantData = $util.newBuffer(object.merchantData);
                }
            }
            if (message.network != null && message.hasOwnProperty("network"))
                object.network = message.network;
            if (message.outputs && message.outputs.length) {
                object.outputs = [];
                for (var j = 0; j < message.outputs.length; ++j)
                    object.outputs[j] = $root.bip70.Output.toObject(message.outputs[j], options);
            }
            if (message.time != null && message.hasOwnProperty("time"))
                if (typeof message.time === "number")
                    object.time = options.longs === String ? String(message.time) : message.time;
                else
                    object.time = options.longs === String ? $util.Long.prototype.toString.call(message.time) : options.longs === Number ? new $util.LongBits(message.time.low >>> 0, message.time.high >>> 0).toNumber(true) : message.time;
            if (message.expires != null && message.hasOwnProperty("expires"))
                if (typeof message.expires === "number")
                    object.expires = options.longs === String ? String(message.expires) : message.expires;
                else
                    object.expires = options.longs === String ? $util.Long.prototype.toString.call(message.expires) : options.longs === Number ? new $util.LongBits(message.expires.low >>> 0, message.expires.high >>> 0).toNumber(true) : message.expires;
            if (message.memo != null && message.hasOwnProperty("memo"))
                object.memo = message.memo;
            if (message.paymentUrl != null && message.hasOwnProperty("paymentUrl"))
                object.paymentUrl = message.paymentUrl;
            if (message.merchantData != null && message.hasOwnProperty("merchantData"))
                object.merchantData = options.bytes === String ? $util.base64.encode(message.merchantData, 0, message.merchantData.length) : options.bytes === Array ? Array.prototype.slice.call(message.merchantData) : message.merchantData;
            return object;
        };

        /**
         * Converts this PaymentDetails to JSON.
         * @function toJSON
         * @memberof bip70.PaymentDetails
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        PaymentDetails.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for PaymentDetails
         * @function getTypeUrl
         * @memberof bip70.PaymentDetails
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        PaymentDetails.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/bip70.PaymentDetails";
        };

        return PaymentDetails;
    })();

    bip70.PaymentRequest = (function() {

        /**
         * Properties of a PaymentRequest.
         * @memberof bip70
         * @interface IPaymentRequest
         * @property {number|null} [paymentDetailsVersion] PaymentRequest paymentDetailsVersion
         * @property {string|null} [pkiType] PaymentRequest pkiType
         * @property {Uint8Array|null} [pkiData] PaymentRequest pkiData
         * @property {Uint8Array} serializedPaymentDetails PaymentRequest serializedPaymentDetails
         * @property {Uint8Array|null} [signature] PaymentRequest signature
         */

        /**
         * Constructs a new PaymentRequest.
         * @memberof bip70
         * @classdesc Represents a PaymentRequest.
         * @implements IPaymentRequest
         * @constructor
         * @param {bip70.IPaymentRequest=} [properties] Properties to set
         */
        function PaymentRequest(properties) {
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * PaymentRequest paymentDetailsVersion.
         * @member {number} paymentDetailsVersion
         * @memberof bip70.PaymentRequest
         * @instance
         */
        PaymentRequest.prototype.paymentDetailsVersion = 1;

        /**
         * PaymentRequest pkiType.
         * @member {string} pkiType
         * @memberof bip70.PaymentRequest
         * @instance
         */
        PaymentRequest.prototype.pkiType = "none";

        /**
         * PaymentRequest pkiData.
         * @member {Uint8Array} pkiData
         * @memberof bip70.PaymentRequest
         * @instance
         */
        PaymentRequest.prototype.pkiData = $util.newBuffer([]);

        /**
         * PaymentRequest serializedPaymentDetails.
         * @member {Uint8Array} serializedPaymentDetails
         * @memberof bip70.PaymentRequest
         * @instance
         */
        PaymentRequest.prototype.serializedPaymentDetails = $util.newBuffer([]);

        /**
         * PaymentRequest signature.
         * @member {Uint8Array} signature
         * @memberof bip70.PaymentRequest
         * @instance
         */
        PaymentRequest.prototype.signature = $util.newBuffer([]);

        /**
         * Creates a new PaymentRequest instance using the specified properties.
         * @function create
         * @memberof bip70.PaymentRequest
         * @static
         * @param {bip70.IPaymentRequest=} [properties] Properties to set
         * @returns {bip70.PaymentRequest} PaymentRequest instance
         */
        PaymentRequest.create = function create(properties) {
            return new PaymentRequest(properties);
        };

        /**
         * Encodes the specified PaymentRequest message. Does not implicitly {@link bip70.PaymentRequest.verify|verify} messages.
         * @function encode
         * @memberof bip70.PaymentRequest
         * @static
         * @param {bip70.IPaymentRequest} message PaymentRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PaymentRequest.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.paymentDetailsVersion != null && Object.hasOwnProperty.call(message, "paymentDetailsVersion"))
                writer.uint32(/* id 1, wireType 0 =*/8).uint32(message.paymentDetailsVersion);
            if (message.pkiType != null && Object.hasOwnProperty.call(message, "pkiType"))
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.pkiType);
            if (message.pkiData != null && Object.hasOwnProperty.call(message, "pkiData"))
                writer.uint32(/* id 3, wireType 2 =*/26).bytes(message.pkiData);
            writer.uint32(/* id 4, wireType 2 =*/34).bytes(message.serializedPaymentDetails);
            if (message.signature != null && Object.hasOwnProperty.call(message, "signature"))
                writer.uint32(/* id 5, wireType 2 =*/42).bytes(message.signature);
            return writer;
        };

        /**
         * Encodes the specified PaymentRequest message, length delimited. Does not implicitly {@link bip70.PaymentRequest.verify|verify} messages.
         * @function encodeDelimited
         * @memberof bip70.PaymentRequest
         * @static
         * @param {bip70.IPaymentRequest} message PaymentRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PaymentRequest.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a PaymentRequest message from the specified reader or buffer.
         * @function decode
         * @memberof bip70.PaymentRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {bip70.PaymentRequest} PaymentRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PaymentRequest.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.bip70.PaymentRequest();
            while (reader.pos < end) {
                var tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.paymentDetailsVersion = reader.uint32();
                        break;
                    }
                case 2: {
                        message.pkiType = reader.string();
                        break;
                    }
                case 3: {
                        message.pkiData = reader.bytes();
                        break;
                    }
                case 4: {
                        message.serializedPaymentDetails = reader.bytes();
                        break;
                    }
                case 5: {
                        message.signature = reader.bytes();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            if (!message.hasOwnProperty("serializedPaymentDetails"))
                throw $util.ProtocolError("missing required 'serializedPaymentDetails'", { instance: message });
            return message;
        };

        /**
         * Decodes a PaymentRequest message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof bip70.PaymentRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {bip70.PaymentRequest} PaymentRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PaymentRequest.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a PaymentRequest message.
         * @function verify
         * @memberof bip70.PaymentRequest
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        PaymentRequest.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.paymentDetailsVersion != null && message.hasOwnProperty("paymentDetailsVersion"))
                if (!$util.isInteger(message.paymentDetailsVersion))
                    return "paymentDetailsVersion: integer expected";
            if (message.pkiType != null && message.hasOwnProperty("pkiType"))
                if (!$util.isString(message.pkiType))
                    return "pkiType: string expected";
            if (message.pkiData != null && message.hasOwnProperty("pkiData"))
                if (!(message.pkiData && typeof message.pkiData.length === "number" || $util.isString(message.pkiData)))
                    return "pkiData: buffer expected";
            if (!(message.serializedPaymentDetails && typeof message.serializedPaymentDetails.length === "number" || $util.isString(message.serializedPaymentDetails)))
                return "serializedPaymentDetails: buffer expected";
            if (message.signature != null && message.hasOwnProperty("signature"))
                if (!(message.signature && typeof message.signature.length === "number" || $util.isString(message.signature)))
                    return "signature: buffer expected";
            return null;
        };

        /**
         * Creates a PaymentRequest message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof bip70.PaymentRequest
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {bip70.PaymentRequest} PaymentRequest
         */
        PaymentRequest.fromObject = function fromObject(object) {
            if (object instanceof $root.bip70.PaymentRequest)
                return object;
            var message = new $root.bip70.PaymentRequest();
            if (object.paymentDetailsVersion != null)
                message.paymentDetailsVersion = object.paymentDetailsVersion >>> 0;
            if (object.pkiType != null)
                message.pkiType = String(object.pkiType);
            if (object.pkiData != null)
                if (typeof object.pkiData === "string")
                    $util.base64.decode(object.pkiData, message.pkiData = $util.newBuffer($util.base64.length(object.pkiData)), 0);
                else if (object.pkiData.length >= 0)
                    message.pkiData = object.pkiData;
            if (object.serializedPaymentDetails != null)
                if (typeof object.serializedPaymentDetails === "string")
                    $util.base64.decode(object.serializedPaymentDetails, message.serializedPaymentDetails = $util.newBuffer($util.base64.length(object.serializedPaymentDetails)), 0);
                else if (object.serializedPaymentDetails.length >= 0)
                    message.serializedPaymentDetails = object.serializedPaymentDetails;
            if (object.signature != null)
                if (typeof object.signature === "string")
                    $util.base64.decode(object.signature, message.signature = $util.newBuffer($util.base64.length(object.signature)), 0);
                else if (object.signature.length >= 0)
                    message.signature = object.signature;
            return message;
        };

        /**
         * Creates a plain object from a PaymentRequest message. Also converts values to other types if specified.
         * @function toObject
         * @memberof bip70.PaymentRequest
         * @static
         * @param {bip70.PaymentRequest} message PaymentRequest
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        PaymentRequest.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.defaults) {
                object.paymentDetailsVersion = 1;
                object.pkiType = "none";
                if (options.bytes === String)
                    object.pkiData = "";
                else {
                    object.pkiData = [];
                    if (options.bytes !== Array)
                        object.pkiData = $util.newBuffer(object.pkiData);
                }
                if (options.bytes === String)
                    object.serializedPaymentDetails = "";
                else {
                    object.serializedPaymentDetails = [];
                    if (options.bytes !== Array)
                        object.serializedPaymentDetails = $util.newBuffer(object.serializedPaymentDetails);
                }
                if (options.bytes === String)
                    object.signature = "";
                else {
                    object.signature = [];
                    if (options.bytes !== Array)
                        object.signature = $util.newBuffer(object.signature);
                }
            }
            if (message.paymentDetailsVersion != null && message.hasOwnProperty("paymentDetailsVersion"))
                object.paymentDetailsVersion = message.paymentDetailsVersion;
            if (message.pkiType != null && message.hasOwnProperty("pkiType"))
                object.pkiType = message.pkiType;
            if (message.pkiData != null && message.hasOwnProperty("pkiData"))
                object.pkiData = options.bytes === String ? $util.base64.encode(message.pkiData, 0, message.pkiData.length) : options.bytes === Array ? Array.prototype.slice.call(message.pkiData) : message.pkiData;
            if (message.serializedPaymentDetails != null && message.hasOwnProperty("serializedPaymentDetails"))
                object.serializedPaymentDetails = options.bytes === String ? $util.base64.encode(message.serializedPaymentDetails, 0, message.serializedPaymentDetails.length) : options.bytes === Array ? Array.prototype.slice.call(message.serializedPaymentDetails) : message.serializedPaymentDetails;
            if (message.signature != null && message.hasOwnProperty("signature"))
                object.signature = options.bytes === String ? $util.base64.encode(message.signature, 0, message.signature.length) : options.bytes === Array ? Array.prototype.slice.call(message.signature) : message.signature;
            return object;
        };

        /**
         * Converts this PaymentRequest to JSON.
         * @function toJSON
         * @memberof bip70.PaymentRequest
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        PaymentRequest.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for PaymentRequest
         * @function getTypeUrl
         * @memberof bip70.PaymentRequest
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        PaymentRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/bip70.PaymentRequest";
        };

        return PaymentRequest;
    })();

    bip70.X509Certificates = (function() {

        /**
         * Properties of a X509Certificates.
         * @memberof bip70
         * @interface IX509Certificates
         * @property {Array.<Uint8Array>|null} [certificate] X509Certificates certificate
         */

        /**
         * Constructs a new X509Certificates.
         * @memberof bip70
         * @classdesc Represents a X509Certificates.
         * @implements IX509Certificates
         * @constructor
         * @param {bip70.IX509Certificates=} [properties] Properties to set
         */
        function X509Certificates(properties) {
            this.certificate = [];
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * X509Certificates certificate.
         * @member {Array.<Uint8Array>} certificate
         * @memberof bip70.X509Certificates
         * @instance
         */
        X509Certificates.prototype.certificate = $util.emptyArray;

        /**
         * Creates a new X509Certificates instance using the specified properties.
         * @function create
         * @memberof bip70.X509Certificates
         * @static
         * @param {bip70.IX509Certificates=} [properties] Properties to set
         * @returns {bip70.X509Certificates} X509Certificates instance
         */
        X509Certificates.create = function create(properties) {
            return new X509Certificates(properties);
        };

        /**
         * Encodes the specified X509Certificates message. Does not implicitly {@link bip70.X509Certificates.verify|verify} messages.
         * @function encode
         * @memberof bip70.X509Certificates
         * @static
         * @param {bip70.IX509Certificates} message X509Certificates message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        X509Certificates.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.certificate != null && message.certificate.length)
                for (var i = 0; i < message.certificate.length; ++i)
                    writer.uint32(/* id 1, wireType 2 =*/10).bytes(message.certificate[i]);
            return writer;
        };

        /**
         * Encodes the specified X509Certificates message, length delimited. Does not implicitly {@link bip70.X509Certificates.verify|verify} messages.
         * @function encodeDelimited
         * @memberof bip70.X509Certificates
         * @static
         * @param {bip70.IX509Certificates} message X509Certificates message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        X509Certificates.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a X509Certificates message from the specified reader or buffer.
         * @function decode
         * @memberof bip70.X509Certificates
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {bip70.X509Certificates} X509Certificates
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        X509Certificates.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.bip70.X509Certificates();
            while (reader.pos < end) {
                var tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        if (!(message.certificate && message.certificate.length))
                            message.certificate = [];
                        message.certificate.push(reader.bytes());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a X509Certificates message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof bip70.X509Certificates
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {bip70.X509Certificates} X509Certificates
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        X509Certificates.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a X509Certificates message.
         * @function verify
         * @memberof bip70.X509Certificates
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        X509Certificates.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.certificate != null && message.hasOwnProperty("certificate")) {
                if (!Array.isArray(message.certificate))
                    return "certificate: array expected";
                for (var i = 0; i < message.certificate.length; ++i)
                    if (!(message.certificate[i] && typeof message.certificate[i].length === "number" || $util.isString(message.certificate[i])))
                        return "certificate: buffer[] expected";
            }
            return null;
        };

        /**
         * Creates a X509Certificates message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof bip70.X509Certificates
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {bip70.X509Certificates} X509Certificates
         */
        X509Certificates.fromObject = function fromObject(object) {
            if (object instanceof $root.bip70.X509Certificates)
                return object;
            var message = new $root.bip70.X509Certificates();
            if (object.certificate) {
                if (!Array.isArray(object.certificate))
                    throw TypeError(".bip70.X509Certificates.certificate: array expected");
                message.certificate = [];
                for (var i = 0; i < object.certificate.length; ++i)
                    if (typeof object.certificate[i] === "string")
                        $util.base64.decode(object.certificate[i], message.certificate[i] = $util.newBuffer($util.base64.length(object.certificate[i])), 0);
                    else if (object.certificate[i].length >= 0)
                        message.certificate[i] = object.certificate[i];
            }
            return message;
        };

        /**
         * Creates a plain object from a X509Certificates message. Also converts values to other types if specified.
         * @function toObject
         * @memberof bip70.X509Certificates
         * @static
         * @param {bip70.X509Certificates} message X509Certificates
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        X509Certificates.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.arrays || options.defaults)
                object.certificate = [];
            if (message.certificate && message.certificate.length) {
                object.certificate = [];
                for (var j = 0; j < message.certificate.length; ++j)
                    object.certificate[j] = options.bytes === String ? $util.base64.encode(message.certificate[j], 0, message.certificate[j].length) : options.bytes === Array ? Array.prototype.slice.call(message.certificate[j]) : message.certificate[j];
            }
            return object;
        };

        /**
         * Converts this X509Certificates to JSON.
         * @function toJSON
         * @memberof bip70.X509Certificates
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        X509Certificates.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for X509Certificates
         * @function getTypeUrl
         * @memberof bip70.X509Certificates
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        X509Certificates.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/bip70.X509Certificates";
        };

        return X509Certificates;
    })();

    bip70.Payment = (function() {

        /**
         * Properties of a Payment.
         * @memberof bip70
         * @interface IPayment
         * @property {Uint8Array|null} [merchantData] Payment merchantData
         * @property {Array.<Uint8Array>|null} [transactions] Payment transactions
         * @property {Array.<bip70.IOutput>|null} [refundTo] Payment refundTo
         * @property {string|null} [memo] Payment memo
         */

        /**
         * Constructs a new Payment.
         * @memberof bip70
         * @classdesc Represents a Payment.
         * @implements IPayment
         * @constructor
         * @param {bip70.IPayment=} [properties] Properties to set
         */
        function Payment(properties) {
            this.transactions = [];
            this.refundTo = [];
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Payment merchantData.
         * @member {Uint8Array} merchantData
         * @memberof bip70.Payment
         * @instance
         */
        Payment.prototype.merchantData = $util.newBuffer([]);

        /**
         * Payment transactions.
         * @member {Array.<Uint8Array>} transactions
         * @memberof bip70.Payment
         * @instance
         */
        Payment.prototype.transactions = $util.emptyArray;

        /**
         * Payment refundTo.
         * @member {Array.<bip70.IOutput>} refundTo
         * @memberof bip70.Payment
         * @instance
         */
        Payment.prototype.refundTo = $util.emptyArray;

        /**
         * Payment memo.
         * @member {string} memo
         * @memberof bip70.Payment
         * @instance
         */
        Payment.prototype.memo = "";

        /**
         * Creates a new Payment instance using the specified properties.
         * @function create
         * @memberof bip70.Payment
         * @static
         * @param {bip70.IPayment=} [properties] Properties to set
         * @returns {bip70.Payment} Payment instance
         */
        Payment.create = function create(properties) {
            return new Payment(properties);
        };

        /**
         * Encodes the specified Payment message. Does not implicitly {@link bip70.Payment.verify|verify} messages.
         * @function encode
         * @memberof bip70.Payment
         * @static
         * @param {bip70.IPayment} message Payment message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Payment.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.merchantData != null && Object.hasOwnProperty.call(message, "merchantData"))
                writer.uint32(/* id 1, wireType 2 =*/10).bytes(message.merchantData);
            if (message.transactions != null && message.transactions.length)
                for (var i = 0; i < message.transactions.length; ++i)
                    writer.uint32(/* id 2, wireType 2 =*/18).bytes(message.transactions[i]);
            if (message.refundTo != null && message.refundTo.length)
                for (var i = 0; i < message.refundTo.length; ++i)
                    $root.bip70.Output.encode(message.refundTo[i], writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
            if (message.memo != null && Object.hasOwnProperty.call(message, "memo"))
                writer.uint32(/* id 4, wireType 2 =*/34).string(message.memo);
            return writer;
        };

        /**
         * Encodes the specified Payment message, length delimited. Does not implicitly {@link bip70.Payment.verify|verify} messages.
         * @function encodeDelimited
         * @memberof bip70.Payment
         * @static
         * @param {bip70.IPayment} message Payment message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Payment.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a Payment message from the specified reader or buffer.
         * @function decode
         * @memberof bip70.Payment
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {bip70.Payment} Payment
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Payment.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.bip70.Payment();
            while (reader.pos < end) {
                var tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.merchantData = reader.bytes();
                        break;
                    }
                case 2: {
                        if (!(message.transactions && message.transactions.length))
                            message.transactions = [];
                        message.transactions.push(reader.bytes());
                        break;
                    }
                case 3: {
                        if (!(message.refundTo && message.refundTo.length))
                            message.refundTo = [];
                        message.refundTo.push($root.bip70.Output.decode(reader, reader.uint32()));
                        break;
                    }
                case 4: {
                        message.memo = reader.string();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a Payment message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof bip70.Payment
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {bip70.Payment} Payment
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Payment.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a Payment message.
         * @function verify
         * @memberof bip70.Payment
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        Payment.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.merchantData != null && message.hasOwnProperty("merchantData"))
                if (!(message.merchantData && typeof message.merchantData.length === "number" || $util.isString(message.merchantData)))
                    return "merchantData: buffer expected";
            if (message.transactions != null && message.hasOwnProperty("transactions")) {
                if (!Array.isArray(message.transactions))
                    return "transactions: array expected";
                for (var i = 0; i < message.transactions.length; ++i)
                    if (!(message.transactions[i] && typeof message.transactions[i].length === "number" || $util.isString(message.transactions[i])))
                        return "transactions: buffer[] expected";
            }
            if (message.refundTo != null && message.hasOwnProperty("refundTo")) {
                if (!Array.isArray(message.refundTo))
                    return "refundTo: array expected";
                for (var i = 0; i < message.refundTo.length; ++i) {
                    var error = $root.bip70.Output.verify(message.refundTo[i]);
                    if (error)
                        return "refundTo." + error;
                }
            }
            if (message.memo != null && message.hasOwnProperty("memo"))
                if (!$util.isString(message.memo))
                    return "memo: string expected";
            return null;
        };

        /**
         * Creates a Payment message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof bip70.Payment
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {bip70.Payment} Payment
         */
        Payment.fromObject = function fromObject(object) {
            if (object instanceof $root.bip70.Payment)
                return object;
            var message = new $root.bip70.Payment();
            if (object.merchantData != null)
                if (typeof object.merchantData === "string")
                    $util.base64.decode(object.merchantData, message.merchantData = $util.newBuffer($util.base64.length(object.merchantData)), 0);
                else if (object.merchantData.length >= 0)
                    message.merchantData = object.merchantData;
            if (object.transactions) {
                if (!Array.isArray(object.transactions))
                    throw TypeError(".bip70.Payment.transactions: array expected");
                message.transactions = [];
                for (var i = 0; i < object.transactions.length; ++i)
                    if (typeof object.transactions[i] === "string")
                        $util.base64.decode(object.transactions[i], message.transactions[i] = $util.newBuffer($util.base64.length(object.transactions[i])), 0);
                    else if (object.transactions[i].length >= 0)
                        message.transactions[i] = object.transactions[i];
            }
            if (object.refundTo) {
                if (!Array.isArray(object.refundTo))
                    throw TypeError(".bip70.Payment.refundTo: array expected");
                message.refundTo = [];
                for (var i = 0; i < object.refundTo.length; ++i) {
                    if (typeof object.refundTo[i] !== "object")
                        throw TypeError(".bip70.Payment.refundTo: object expected");
                    message.refundTo[i] = $root.bip70.Output.fromObject(object.refundTo[i]);
                }
            }
            if (object.memo != null)
                message.memo = String(object.memo);
            return message;
        };

        /**
         * Creates a plain object from a Payment message. Also converts values to other types if specified.
         * @function toObject
         * @memberof bip70.Payment
         * @static
         * @param {bip70.Payment} message Payment
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        Payment.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.arrays || options.defaults) {
                object.transactions = [];
                object.refundTo = [];
            }
            if (options.defaults) {
                if (options.bytes === String)
                    object.merchantData = "";
                else {
                    object.merchantData = [];
                    if (options.bytes !== Array)
                        object.merchantData = $util.newBuffer(object.merchantData);
                }
                object.memo = "";
            }
            if (message.merchantData != null && message.hasOwnProperty("merchantData"))
                object.merchantData = options.bytes === String ? $util.base64.encode(message.merchantData, 0, message.merchantData.length) : options.bytes === Array ? Array.prototype.slice.call(message.merchantData) : message.merchantData;
            if (message.transactions && message.transactions.length) {
                object.transactions = [];
                for (var j = 0; j < message.transactions.length; ++j)
                    object.transactions[j] = options.bytes === String ? $util.base64.encode(message.transactions[j], 0, message.transactions[j].length) : options.bytes === Array ? Array.prototype.slice.call(message.transactions[j]) : message.transactions[j];
            }
            if (message.refundTo && message.refundTo.length) {
                object.refundTo = [];
                for (var j = 0; j < message.refundTo.length; ++j)
                    object.refundTo[j] = $root.bip70.Output.toObject(message.refundTo[j], options);
            }
            if (message.memo != null && message.hasOwnProperty("memo"))
                object.memo = message.memo;
            return object;
        };

        /**
         * Converts this Payment to JSON.
         * @function toJSON
         * @memberof bip70.Payment
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        Payment.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for Payment
         * @function getTypeUrl
         * @memberof bip70.Payment
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        Payment.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/bip70.Payment";
        };

        return Payment;
    })();

    bip70.PaymentACK = (function() {

        /**
         * Properties of a PaymentACK.
         * @memberof bip70
         * @interface IPaymentACK
         * @property {bip70.IPayment} payment PaymentACK payment
         * @property {string|null} [memo] PaymentACK memo
         */

        /**
         * Constructs a new PaymentACK.
         * @memberof bip70
         * @classdesc Represents a PaymentACK.
         * @implements IPaymentACK
         * @constructor
         * @param {bip70.IPaymentACK=} [properties] Properties to set
         */
        function PaymentACK(properties) {
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * PaymentACK payment.
         * @member {bip70.IPayment} payment
         * @memberof bip70.PaymentACK
         * @instance
         */
        PaymentACK.prototype.payment = null;

        /**
         * PaymentACK memo.
         * @member {string} memo
         * @memberof bip70.PaymentACK
         * @instance
         */
        PaymentACK.prototype.memo = "";

        /**
         * Creates a new PaymentACK instance using the specified properties.
         * @function create
         * @memberof bip70.PaymentACK
         * @static
         * @param {bip70.IPaymentACK=} [properties] Properties to set
         * @returns {bip70.PaymentACK} PaymentACK instance
         */
        PaymentACK.create = function create(properties) {
            return new PaymentACK(properties);
        };

        /**
         * Encodes the specified PaymentACK message. Does not implicitly {@link bip70.PaymentACK.verify|verify} messages.
         * @function encode
         * @memberof bip70.PaymentACK
         * @static
         * @param {bip70.IPaymentACK} message PaymentACK message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PaymentACK.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            $root.bip70.Payment.encode(message.payment, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            if (message.memo != null && Object.hasOwnProperty.call(message, "memo"))
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.memo);
            return writer;
        };

        /**
         * Encodes the specified PaymentACK message, length delimited. Does not implicitly {@link bip70.PaymentACK.verify|verify} messages.
         * @function encodeDelimited
         * @memberof bip70.PaymentACK
         * @static
         * @param {bip70.IPaymentACK} message PaymentACK message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PaymentACK.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a PaymentACK message from the specified reader or buffer.
         * @function decode
         * @memberof bip70.PaymentACK
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {bip70.PaymentACK} PaymentACK
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PaymentACK.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.bip70.PaymentACK();
            while (reader.pos < end) {
                var tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.payment = $root.bip70.Payment.decode(reader, reader.uint32());
                        break;
                    }
                case 2: {
                        message.memo = reader.string();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            if (!message.hasOwnProperty("payment"))
                throw $util.ProtocolError("missing required 'payment'", { instance: message });
            return message;
        };

        /**
         * Decodes a PaymentACK message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof bip70.PaymentACK
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {bip70.PaymentACK} PaymentACK
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PaymentACK.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a PaymentACK message.
         * @function verify
         * @memberof bip70.PaymentACK
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        PaymentACK.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            {
                var error = $root.bip70.Payment.verify(message.payment);
                if (error)
                    return "payment." + error;
            }
            if (message.memo != null && message.hasOwnProperty("memo"))
                if (!$util.isString(message.memo))
                    return "memo: string expected";
            return null;
        };

        /**
         * Creates a PaymentACK message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof bip70.PaymentACK
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {bip70.PaymentACK} PaymentACK
         */
        PaymentACK.fromObject = function fromObject(object) {
            if (object instanceof $root.bip70.PaymentACK)
                return object;
            var message = new $root.bip70.PaymentACK();
            if (object.payment != null) {
                if (typeof object.payment !== "object")
                    throw TypeError(".bip70.PaymentACK.payment: object expected");
                message.payment = $root.bip70.Payment.fromObject(object.payment);
            }
            if (object.memo != null)
                message.memo = String(object.memo);
            return message;
        };

        /**
         * Creates a plain object from a PaymentACK message. Also converts values to other types if specified.
         * @function toObject
         * @memberof bip70.PaymentACK
         * @static
         * @param {bip70.PaymentACK} message PaymentACK
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        PaymentACK.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.defaults) {
                object.payment = null;
                object.memo = "";
            }
            if (message.payment != null && message.hasOwnProperty("payment"))
                object.payment = $root.bip70.Payment.toObject(message.payment, options);
            if (message.memo != null && message.hasOwnProperty("memo"))
                object.memo = message.memo;
            return object;
        };

        /**
         * Converts this PaymentACK to JSON.
         * @function toJSON
         * @memberof bip70.PaymentACK
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        PaymentACK.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for PaymentACK
         * @function getTypeUrl
         * @memberof bip70.PaymentACK
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        PaymentACK.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/bip70.PaymentACK";
        };

        return PaymentACK;
    })();

    return bip70;
})();

module.exports = $root;
