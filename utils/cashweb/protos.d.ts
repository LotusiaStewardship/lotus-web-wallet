import * as $protobuf from "protobufjs";
import Long = require("long");
/** Namespace relay. */
export namespace relay {

    /** Properties of a Header. */
    interface IHeader {

        /** Header name */
        name?: (string|null);

        /** Header value */
        value?: (string|null);
    }

    /** Represents a Header. */
    class Header implements IHeader {

        /**
         * Constructs a new Header.
         * @param [properties] Properties to set
         */
        constructor(properties?: relay.IHeader);

        /** Header name. */
        public name: string;

        /** Header value. */
        public value: string;

        /**
         * Creates a new Header instance using the specified properties.
         * @param [properties] Properties to set
         * @returns Header instance
         */
        public static create(properties?: relay.IHeader): relay.Header;

        /**
         * Encodes the specified Header message. Does not implicitly {@link relay.Header.verify|verify} messages.
         * @param message Header message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: relay.IHeader, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified Header message, length delimited. Does not implicitly {@link relay.Header.verify|verify} messages.
         * @param message Header message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: relay.IHeader, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a Header message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns Header
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): relay.Header;

        /**
         * Decodes a Header message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns Header
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): relay.Header;

        /**
         * Verifies a Header message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a Header message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns Header
         */
        public static fromObject(object: { [k: string]: any }): relay.Header;

        /**
         * Creates a plain object from a Header message. Also converts values to other types if specified.
         * @param message Header
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: relay.Header, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this Header to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for Header
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a ProfileEntry. */
    interface IProfileEntry {

        /** ProfileEntry kind */
        kind?: (string|null);

        /** ProfileEntry headers */
        headers?: (relay.IHeader[]|null);

        /** ProfileEntry body */
        body?: (Uint8Array|null);
    }

    /** Represents a ProfileEntry. */
    class ProfileEntry implements IProfileEntry {

        /**
         * Constructs a new ProfileEntry.
         * @param [properties] Properties to set
         */
        constructor(properties?: relay.IProfileEntry);

        /** ProfileEntry kind. */
        public kind: string;

        /** ProfileEntry headers. */
        public headers: relay.IHeader[];

        /** ProfileEntry body. */
        public body: Uint8Array;

        /**
         * Creates a new ProfileEntry instance using the specified properties.
         * @param [properties] Properties to set
         * @returns ProfileEntry instance
         */
        public static create(properties?: relay.IProfileEntry): relay.ProfileEntry;

        /**
         * Encodes the specified ProfileEntry message. Does not implicitly {@link relay.ProfileEntry.verify|verify} messages.
         * @param message ProfileEntry message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: relay.IProfileEntry, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified ProfileEntry message, length delimited. Does not implicitly {@link relay.ProfileEntry.verify|verify} messages.
         * @param message ProfileEntry message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: relay.IProfileEntry, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a ProfileEntry message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns ProfileEntry
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): relay.ProfileEntry;

        /**
         * Decodes a ProfileEntry message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns ProfileEntry
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): relay.ProfileEntry;

        /**
         * Verifies a ProfileEntry message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a ProfileEntry message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns ProfileEntry
         */
        public static fromObject(object: { [k: string]: any }): relay.ProfileEntry;

        /**
         * Creates a plain object from a ProfileEntry message. Also converts values to other types if specified.
         * @param message ProfileEntry
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: relay.ProfileEntry, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this ProfileEntry to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for ProfileEntry
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a Profile. */
    interface IProfile {

        /** Profile timestamp */
        timestamp?: (number|Long|null);

        /** Profile ttl */
        ttl?: (number|Long|null);

        /** Profile entries */
        entries?: (relay.IProfileEntry[]|null);
    }

    /** Represents a Profile. */
    class Profile implements IProfile {

        /**
         * Constructs a new Profile.
         * @param [properties] Properties to set
         */
        constructor(properties?: relay.IProfile);

        /** Profile timestamp. */
        public timestamp: (number|Long);

        /** Profile ttl. */
        public ttl: (number|Long);

        /** Profile entries. */
        public entries: relay.IProfileEntry[];

        /**
         * Creates a new Profile instance using the specified properties.
         * @param [properties] Properties to set
         * @returns Profile instance
         */
        public static create(properties?: relay.IProfile): relay.Profile;

        /**
         * Encodes the specified Profile message. Does not implicitly {@link relay.Profile.verify|verify} messages.
         * @param message Profile message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: relay.IProfile, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified Profile message, length delimited. Does not implicitly {@link relay.Profile.verify|verify} messages.
         * @param message Profile message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: relay.IProfile, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a Profile message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns Profile
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): relay.Profile;

        /**
         * Decodes a Profile message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns Profile
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): relay.Profile;

        /**
         * Verifies a Profile message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a Profile message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns Profile
         */
        public static fromObject(object: { [k: string]: any }): relay.Profile;

        /**
         * Creates a plain object from a Profile message. Also converts values to other types if specified.
         * @param message Profile
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: relay.Profile, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this Profile to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for Profile
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a PayloadEntry. */
    interface IPayloadEntry {

        /** PayloadEntry kind */
        kind?: (string|null);

        /** PayloadEntry headers */
        headers?: (relay.IHeader[]|null);

        /** PayloadEntry body */
        body?: (Uint8Array|null);
    }

    /** Represents a PayloadEntry. */
    class PayloadEntry implements IPayloadEntry {

        /**
         * Constructs a new PayloadEntry.
         * @param [properties] Properties to set
         */
        constructor(properties?: relay.IPayloadEntry);

        /** PayloadEntry kind. */
        public kind: string;

        /** PayloadEntry headers. */
        public headers: relay.IHeader[];

        /** PayloadEntry body. */
        public body: Uint8Array;

        /**
         * Creates a new PayloadEntry instance using the specified properties.
         * @param [properties] Properties to set
         * @returns PayloadEntry instance
         */
        public static create(properties?: relay.IPayloadEntry): relay.PayloadEntry;

        /**
         * Encodes the specified PayloadEntry message. Does not implicitly {@link relay.PayloadEntry.verify|verify} messages.
         * @param message PayloadEntry message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: relay.IPayloadEntry, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified PayloadEntry message, length delimited. Does not implicitly {@link relay.PayloadEntry.verify|verify} messages.
         * @param message PayloadEntry message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: relay.IPayloadEntry, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a PayloadEntry message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns PayloadEntry
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): relay.PayloadEntry;

        /**
         * Decodes a PayloadEntry message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns PayloadEntry
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): relay.PayloadEntry;

        /**
         * Verifies a PayloadEntry message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a PayloadEntry message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns PayloadEntry
         */
        public static fromObject(object: { [k: string]: any }): relay.PayloadEntry;

        /**
         * Creates a plain object from a PayloadEntry message. Also converts values to other types if specified.
         * @param message PayloadEntry
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: relay.PayloadEntry, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this PayloadEntry to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for PayloadEntry
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a Payload. */
    interface IPayload {

        /** Payload timestamp */
        timestamp?: (number|Long|null);

        /** Payload entries */
        entries?: (relay.IPayloadEntry[]|null);
    }

    /** Represents a Payload. */
    class Payload implements IPayload {

        /**
         * Constructs a new Payload.
         * @param [properties] Properties to set
         */
        constructor(properties?: relay.IPayload);

        /** Payload timestamp. */
        public timestamp: (number|Long);

        /** Payload entries. */
        public entries: relay.IPayloadEntry[];

        /**
         * Creates a new Payload instance using the specified properties.
         * @param [properties] Properties to set
         * @returns Payload instance
         */
        public static create(properties?: relay.IPayload): relay.Payload;

        /**
         * Encodes the specified Payload message. Does not implicitly {@link relay.Payload.verify|verify} messages.
         * @param message Payload message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: relay.IPayload, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified Payload message, length delimited. Does not implicitly {@link relay.Payload.verify|verify} messages.
         * @param message Payload message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: relay.IPayload, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a Payload message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns Payload
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): relay.Payload;

        /**
         * Decodes a Payload message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns Payload
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): relay.Payload;

        /**
         * Verifies a Payload message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a Payload message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns Payload
         */
        public static fromObject(object: { [k: string]: any }): relay.Payload;

        /**
         * Creates a plain object from a Payload message. Also converts values to other types if specified.
         * @param message Payload
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: relay.Payload, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this Payload to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for Payload
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a StampOutpoints. */
    interface IStampOutpoints {

        /** StampOutpoints stampTx */
        stampTx?: (Uint8Array|null);

        /** StampOutpoints vouts */
        vouts?: (number[]|null);
    }

    /** Represents a StampOutpoints. */
    class StampOutpoints implements IStampOutpoints {

        /**
         * Constructs a new StampOutpoints.
         * @param [properties] Properties to set
         */
        constructor(properties?: relay.IStampOutpoints);

        /** StampOutpoints stampTx. */
        public stampTx: Uint8Array;

        /** StampOutpoints vouts. */
        public vouts: number[];

        /**
         * Creates a new StampOutpoints instance using the specified properties.
         * @param [properties] Properties to set
         * @returns StampOutpoints instance
         */
        public static create(properties?: relay.IStampOutpoints): relay.StampOutpoints;

        /**
         * Encodes the specified StampOutpoints message. Does not implicitly {@link relay.StampOutpoints.verify|verify} messages.
         * @param message StampOutpoints message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: relay.IStampOutpoints, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified StampOutpoints message, length delimited. Does not implicitly {@link relay.StampOutpoints.verify|verify} messages.
         * @param message StampOutpoints message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: relay.IStampOutpoints, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a StampOutpoints message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns StampOutpoints
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): relay.StampOutpoints;

        /**
         * Decodes a StampOutpoints message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns StampOutpoints
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): relay.StampOutpoints;

        /**
         * Verifies a StampOutpoints message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a StampOutpoints message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns StampOutpoints
         */
        public static fromObject(object: { [k: string]: any }): relay.StampOutpoints;

        /**
         * Creates a plain object from a StampOutpoints message. Also converts values to other types if specified.
         * @param message StampOutpoints
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: relay.StampOutpoints, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this StampOutpoints to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for StampOutpoints
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a Stamp. */
    interface IStamp {

        /** Stamp stampType */
        stampType?: (relay.Stamp.StampType|null);

        /** Stamp stampOutpoints */
        stampOutpoints?: (relay.IStampOutpoints[]|null);
    }

    /** Represents a Stamp. */
    class Stamp implements IStamp {

        /**
         * Constructs a new Stamp.
         * @param [properties] Properties to set
         */
        constructor(properties?: relay.IStamp);

        /** Stamp stampType. */
        public stampType: relay.Stamp.StampType;

        /** Stamp stampOutpoints. */
        public stampOutpoints: relay.IStampOutpoints[];

        /**
         * Creates a new Stamp instance using the specified properties.
         * @param [properties] Properties to set
         * @returns Stamp instance
         */
        public static create(properties?: relay.IStamp): relay.Stamp;

        /**
         * Encodes the specified Stamp message. Does not implicitly {@link relay.Stamp.verify|verify} messages.
         * @param message Stamp message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: relay.IStamp, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified Stamp message, length delimited. Does not implicitly {@link relay.Stamp.verify|verify} messages.
         * @param message Stamp message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: relay.IStamp, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a Stamp message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns Stamp
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): relay.Stamp;

        /**
         * Decodes a Stamp message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns Stamp
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): relay.Stamp;

        /**
         * Verifies a Stamp message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a Stamp message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns Stamp
         */
        public static fromObject(object: { [k: string]: any }): relay.Stamp;

        /**
         * Creates a plain object from a Stamp message. Also converts values to other types if specified.
         * @param message Stamp
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: relay.Stamp, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this Stamp to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for Stamp
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    namespace Stamp {

        /** StampType enum. */
        enum StampType {
            None = 0,
            MessageCommitment = 1
        }
    }

    /** Properties of a Message. */
    interface IMessage {

        /** Message sourcePublicKey */
        sourcePublicKey?: (Uint8Array|null);

        /** Message destinationPublicKey */
        destinationPublicKey?: (Uint8Array|null);

        /** Message receivedTime */
        receivedTime?: (number|Long|null);

        /** Message payloadDigest */
        payloadDigest?: (Uint8Array|null);

        /** Message stamp */
        stamp?: (relay.IStamp|null);

        /** Message scheme */
        scheme?: (relay.Message.EncryptionScheme|null);

        /** Message salt */
        salt?: (Uint8Array|null);

        /** Message payloadHmac */
        payloadHmac?: (Uint8Array|null);

        /** Message payloadSize */
        payloadSize?: (number|Long|null);

        /** Message payload */
        payload?: (Uint8Array|null);
    }

    /** Represents a Message. */
    class Message implements IMessage {

        /**
         * Constructs a new Message.
         * @param [properties] Properties to set
         */
        constructor(properties?: relay.IMessage);

        /** Message sourcePublicKey. */
        public sourcePublicKey: Uint8Array;

        /** Message destinationPublicKey. */
        public destinationPublicKey: Uint8Array;

        /** Message receivedTime. */
        public receivedTime: (number|Long);

        /** Message payloadDigest. */
        public payloadDigest: Uint8Array;

        /** Message stamp. */
        public stamp?: (relay.IStamp|null);

        /** Message scheme. */
        public scheme: relay.Message.EncryptionScheme;

        /** Message salt. */
        public salt: Uint8Array;

        /** Message payloadHmac. */
        public payloadHmac: Uint8Array;

        /** Message payloadSize. */
        public payloadSize: (number|Long);

        /** Message payload. */
        public payload: Uint8Array;

        /**
         * Creates a new Message instance using the specified properties.
         * @param [properties] Properties to set
         * @returns Message instance
         */
        public static create(properties?: relay.IMessage): relay.Message;

        /**
         * Encodes the specified Message message. Does not implicitly {@link relay.Message.verify|verify} messages.
         * @param message Message message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: relay.IMessage, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified Message message, length delimited. Does not implicitly {@link relay.Message.verify|verify} messages.
         * @param message Message message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: relay.IMessage, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a Message message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns Message
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): relay.Message;

        /**
         * Decodes a Message message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns Message
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): relay.Message;

        /**
         * Verifies a Message message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a Message message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns Message
         */
        public static fromObject(object: { [k: string]: any }): relay.Message;

        /**
         * Creates a plain object from a Message message. Also converts values to other types if specified.
         * @param message Message
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: relay.Message, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this Message to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for Message
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    namespace Message {

        /** EncryptionScheme enum. */
        enum EncryptionScheme {
            None = 0,
            EphemeralDH = 1
        }
    }

    /** Properties of a MessageSet. */
    interface IMessageSet {

        /** MessageSet messages */
        messages?: (relay.IMessage[]|null);
    }

    /** Represents a MessageSet. */
    class MessageSet implements IMessageSet {

        /**
         * Constructs a new MessageSet.
         * @param [properties] Properties to set
         */
        constructor(properties?: relay.IMessageSet);

        /** MessageSet messages. */
        public messages: relay.IMessage[];

        /**
         * Creates a new MessageSet instance using the specified properties.
         * @param [properties] Properties to set
         * @returns MessageSet instance
         */
        public static create(properties?: relay.IMessageSet): relay.MessageSet;

        /**
         * Encodes the specified MessageSet message. Does not implicitly {@link relay.MessageSet.verify|verify} messages.
         * @param message MessageSet message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: relay.IMessageSet, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified MessageSet message, length delimited. Does not implicitly {@link relay.MessageSet.verify|verify} messages.
         * @param message MessageSet message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: relay.IMessageSet, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a MessageSet message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns MessageSet
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): relay.MessageSet;

        /**
         * Decodes a MessageSet message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns MessageSet
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): relay.MessageSet;

        /**
         * Verifies a MessageSet message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a MessageSet message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns MessageSet
         */
        public static fromObject(object: { [k: string]: any }): relay.MessageSet;

        /**
         * Creates a plain object from a MessageSet message. Also converts values to other types if specified.
         * @param message MessageSet
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: relay.MessageSet, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this MessageSet to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for MessageSet
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a PushError. */
    interface IPushError {

        /** PushError statusCode */
        statusCode?: (number|null);

        /** PushError errorText */
        errorText?: (string|null);
    }

    /** Represents a PushError. */
    class PushError implements IPushError {

        /**
         * Constructs a new PushError.
         * @param [properties] Properties to set
         */
        constructor(properties?: relay.IPushError);

        /** PushError statusCode. */
        public statusCode: number;

        /** PushError errorText. */
        public errorText: string;

        /**
         * Creates a new PushError instance using the specified properties.
         * @param [properties] Properties to set
         * @returns PushError instance
         */
        public static create(properties?: relay.IPushError): relay.PushError;

        /**
         * Encodes the specified PushError message. Does not implicitly {@link relay.PushError.verify|verify} messages.
         * @param message PushError message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: relay.IPushError, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified PushError message, length delimited. Does not implicitly {@link relay.PushError.verify|verify} messages.
         * @param message PushError message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: relay.IPushError, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a PushError message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns PushError
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): relay.PushError;

        /**
         * Decodes a PushError message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns PushError
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): relay.PushError;

        /**
         * Verifies a PushError message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a PushError message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns PushError
         */
        public static fromObject(object: { [k: string]: any }): relay.PushError;

        /**
         * Creates a plain object from a PushError message. Also converts values to other types if specified.
         * @param message PushError
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: relay.PushError, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this PushError to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for PushError
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a PushErrors. */
    interface IPushErrors {

        /** PushErrors errors */
        errors?: ({ [k: string]: relay.IPushError }|null);
    }

    /** Represents a PushErrors. */
    class PushErrors implements IPushErrors {

        /**
         * Constructs a new PushErrors.
         * @param [properties] Properties to set
         */
        constructor(properties?: relay.IPushErrors);

        /** PushErrors errors. */
        public errors: { [k: string]: relay.IPushError };

        /**
         * Creates a new PushErrors instance using the specified properties.
         * @param [properties] Properties to set
         * @returns PushErrors instance
         */
        public static create(properties?: relay.IPushErrors): relay.PushErrors;

        /**
         * Encodes the specified PushErrors message. Does not implicitly {@link relay.PushErrors.verify|verify} messages.
         * @param message PushErrors message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: relay.IPushErrors, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified PushErrors message, length delimited. Does not implicitly {@link relay.PushErrors.verify|verify} messages.
         * @param message PushErrors message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: relay.IPushErrors, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a PushErrors message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns PushErrors
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): relay.PushErrors;

        /**
         * Decodes a PushErrors message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns PushErrors
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): relay.PushErrors;

        /**
         * Verifies a PushErrors message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a PushErrors message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns PushErrors
         */
        public static fromObject(object: { [k: string]: any }): relay.PushErrors;

        /**
         * Creates a plain object from a PushErrors message. Also converts values to other types if specified.
         * @param message PushErrors
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: relay.PushErrors, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this PushErrors to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for PushErrors
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a MessagePage. */
    interface IMessagePage {

        /** MessagePage messages */
        messages?: (relay.IMessage[]|null);

        /** MessagePage startTime */
        startTime?: (number|Long|null);

        /** MessagePage endTime */
        endTime?: (number|Long|null);

        /** MessagePage startDigest */
        startDigest?: (Uint8Array|null);

        /** MessagePage endDigest */
        endDigest?: (Uint8Array|null);
    }

    /** Represents a MessagePage. */
    class MessagePage implements IMessagePage {

        /**
         * Constructs a new MessagePage.
         * @param [properties] Properties to set
         */
        constructor(properties?: relay.IMessagePage);

        /** MessagePage messages. */
        public messages: relay.IMessage[];

        /** MessagePage startTime. */
        public startTime: (number|Long);

        /** MessagePage endTime. */
        public endTime: (number|Long);

        /** MessagePage startDigest. */
        public startDigest: Uint8Array;

        /** MessagePage endDigest. */
        public endDigest: Uint8Array;

        /**
         * Creates a new MessagePage instance using the specified properties.
         * @param [properties] Properties to set
         * @returns MessagePage instance
         */
        public static create(properties?: relay.IMessagePage): relay.MessagePage;

        /**
         * Encodes the specified MessagePage message. Does not implicitly {@link relay.MessagePage.verify|verify} messages.
         * @param message MessagePage message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: relay.IMessagePage, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified MessagePage message, length delimited. Does not implicitly {@link relay.MessagePage.verify|verify} messages.
         * @param message MessagePage message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: relay.IMessagePage, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a MessagePage message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns MessagePage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): relay.MessagePage;

        /**
         * Decodes a MessagePage message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns MessagePage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): relay.MessagePage;

        /**
         * Verifies a MessagePage message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a MessagePage message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns MessagePage
         */
        public static fromObject(object: { [k: string]: any }): relay.MessagePage;

        /**
         * Creates a plain object from a MessagePage message. Also converts values to other types if specified.
         * @param message MessagePage
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: relay.MessagePage, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this MessagePage to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for MessagePage
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a PayloadPage. */
    interface IPayloadPage {

        /** PayloadPage payloads */
        payloads?: (Uint8Array[]|null);

        /** PayloadPage startTime */
        startTime?: (number|Long|null);

        /** PayloadPage endTime */
        endTime?: (number|Long|null);

        /** PayloadPage startDigest */
        startDigest?: (Uint8Array|null);

        /** PayloadPage endDigest */
        endDigest?: (Uint8Array|null);
    }

    /** Represents a PayloadPage. */
    class PayloadPage implements IPayloadPage {

        /**
         * Constructs a new PayloadPage.
         * @param [properties] Properties to set
         */
        constructor(properties?: relay.IPayloadPage);

        /** PayloadPage payloads. */
        public payloads: Uint8Array[];

        /** PayloadPage startTime. */
        public startTime: (number|Long);

        /** PayloadPage endTime. */
        public endTime: (number|Long);

        /** PayloadPage startDigest. */
        public startDigest: Uint8Array;

        /** PayloadPage endDigest. */
        public endDigest: Uint8Array;

        /**
         * Creates a new PayloadPage instance using the specified properties.
         * @param [properties] Properties to set
         * @returns PayloadPage instance
         */
        public static create(properties?: relay.IPayloadPage): relay.PayloadPage;

        /**
         * Encodes the specified PayloadPage message. Does not implicitly {@link relay.PayloadPage.verify|verify} messages.
         * @param message PayloadPage message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: relay.IPayloadPage, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified PayloadPage message, length delimited. Does not implicitly {@link relay.PayloadPage.verify|verify} messages.
         * @param message PayloadPage message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: relay.IPayloadPage, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a PayloadPage message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns PayloadPage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): relay.PayloadPage;

        /**
         * Decodes a PayloadPage message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns PayloadPage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): relay.PayloadPage;

        /**
         * Verifies a PayloadPage message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a PayloadPage message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns PayloadPage
         */
        public static fromObject(object: { [k: string]: any }): relay.PayloadPage;

        /**
         * Creates a plain object from a PayloadPage message. Also converts values to other types if specified.
         * @param message PayloadPage
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: relay.PayloadPage, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this PayloadPage to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for PayloadPage
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }
}

/** Namespace stealth. */
export namespace stealth {

    /** Properties of a StealthOutpoints. */
    interface IStealthOutpoints {

        /** StealthOutpoints stealthTx */
        stealthTx?: (Uint8Array|null);

        /** StealthOutpoints vouts */
        vouts?: (number[]|null);
    }

    /** Represents a StealthOutpoints. */
    class StealthOutpoints implements IStealthOutpoints {

        /**
         * Constructs a new StealthOutpoints.
         * @param [properties] Properties to set
         */
        constructor(properties?: stealth.IStealthOutpoints);

        /** StealthOutpoints stealthTx. */
        public stealthTx: Uint8Array;

        /** StealthOutpoints vouts. */
        public vouts: number[];

        /**
         * Creates a new StealthOutpoints instance using the specified properties.
         * @param [properties] Properties to set
         * @returns StealthOutpoints instance
         */
        public static create(properties?: stealth.IStealthOutpoints): stealth.StealthOutpoints;

        /**
         * Encodes the specified StealthOutpoints message. Does not implicitly {@link stealth.StealthOutpoints.verify|verify} messages.
         * @param message StealthOutpoints message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: stealth.IStealthOutpoints, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified StealthOutpoints message, length delimited. Does not implicitly {@link stealth.StealthOutpoints.verify|verify} messages.
         * @param message StealthOutpoints message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: stealth.IStealthOutpoints, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a StealthOutpoints message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns StealthOutpoints
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): stealth.StealthOutpoints;

        /**
         * Decodes a StealthOutpoints message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns StealthOutpoints
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): stealth.StealthOutpoints;

        /**
         * Verifies a StealthOutpoints message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a StealthOutpoints message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns StealthOutpoints
         */
        public static fromObject(object: { [k: string]: any }): stealth.StealthOutpoints;

        /**
         * Creates a plain object from a StealthOutpoints message. Also converts values to other types if specified.
         * @param message StealthOutpoints
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: stealth.StealthOutpoints, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this StealthOutpoints to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for StealthOutpoints
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a StealthPaymentEntry. */
    interface IStealthPaymentEntry {

        /** StealthPaymentEntry ephemeralPubKey */
        ephemeralPubKey?: (Uint8Array|null);

        /** StealthPaymentEntry outpoints */
        outpoints?: (stealth.IStealthOutpoints[]|null);
    }

    /** Represents a StealthPaymentEntry. */
    class StealthPaymentEntry implements IStealthPaymentEntry {

        /**
         * Constructs a new StealthPaymentEntry.
         * @param [properties] Properties to set
         */
        constructor(properties?: stealth.IStealthPaymentEntry);

        /** StealthPaymentEntry ephemeralPubKey. */
        public ephemeralPubKey: Uint8Array;

        /** StealthPaymentEntry outpoints. */
        public outpoints: stealth.IStealthOutpoints[];

        /**
         * Creates a new StealthPaymentEntry instance using the specified properties.
         * @param [properties] Properties to set
         * @returns StealthPaymentEntry instance
         */
        public static create(properties?: stealth.IStealthPaymentEntry): stealth.StealthPaymentEntry;

        /**
         * Encodes the specified StealthPaymentEntry message. Does not implicitly {@link stealth.StealthPaymentEntry.verify|verify} messages.
         * @param message StealthPaymentEntry message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: stealth.IStealthPaymentEntry, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified StealthPaymentEntry message, length delimited. Does not implicitly {@link stealth.StealthPaymentEntry.verify|verify} messages.
         * @param message StealthPaymentEntry message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: stealth.IStealthPaymentEntry, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a StealthPaymentEntry message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns StealthPaymentEntry
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): stealth.StealthPaymentEntry;

        /**
         * Decodes a StealthPaymentEntry message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns StealthPaymentEntry
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): stealth.StealthPaymentEntry;

        /**
         * Verifies a StealthPaymentEntry message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a StealthPaymentEntry message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns StealthPaymentEntry
         */
        public static fromObject(object: { [k: string]: any }): stealth.StealthPaymentEntry;

        /**
         * Creates a plain object from a StealthPaymentEntry message. Also converts values to other types if specified.
         * @param message StealthPaymentEntry
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: stealth.StealthPaymentEntry, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this StealthPaymentEntry to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for StealthPaymentEntry
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }
}

/** Namespace keyserver. */
export namespace keyserver {

    /** Properties of a Header. */
    interface IHeader {

        /** Header name */
        name?: (string|null);

        /** Header value */
        value?: (string|null);
    }

    /** Represents a Header. */
    class Header implements IHeader {

        /**
         * Constructs a new Header.
         * @param [properties] Properties to set
         */
        constructor(properties?: keyserver.IHeader);

        /** Header name. */
        public name: string;

        /** Header value. */
        public value: string;

        /**
         * Creates a new Header instance using the specified properties.
         * @param [properties] Properties to set
         * @returns Header instance
         */
        public static create(properties?: keyserver.IHeader): keyserver.Header;

        /**
         * Encodes the specified Header message. Does not implicitly {@link keyserver.Header.verify|verify} messages.
         * @param message Header message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: keyserver.IHeader, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified Header message, length delimited. Does not implicitly {@link keyserver.Header.verify|verify} messages.
         * @param message Header message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: keyserver.IHeader, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a Header message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns Header
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): keyserver.Header;

        /**
         * Decodes a Header message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns Header
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): keyserver.Header;

        /**
         * Verifies a Header message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a Header message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns Header
         */
        public static fromObject(object: { [k: string]: any }): keyserver.Header;

        /**
         * Creates a plain object from a Header message. Also converts values to other types if specified.
         * @param message Header
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: keyserver.Header, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this Header to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for Header
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of an Entry. */
    interface IEntry {

        /** Entry kind */
        kind?: (string|null);

        /** Entry headers */
        headers?: (keyserver.IHeader[]|null);

        /** Entry body */
        body?: (Uint8Array|null);
    }

    /** Represents an Entry. */
    class Entry implements IEntry {

        /**
         * Constructs a new Entry.
         * @param [properties] Properties to set
         */
        constructor(properties?: keyserver.IEntry);

        /** Entry kind. */
        public kind: string;

        /** Entry headers. */
        public headers: keyserver.IHeader[];

        /** Entry body. */
        public body: Uint8Array;

        /**
         * Creates a new Entry instance using the specified properties.
         * @param [properties] Properties to set
         * @returns Entry instance
         */
        public static create(properties?: keyserver.IEntry): keyserver.Entry;

        /**
         * Encodes the specified Entry message. Does not implicitly {@link keyserver.Entry.verify|verify} messages.
         * @param message Entry message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: keyserver.IEntry, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified Entry message, length delimited. Does not implicitly {@link keyserver.Entry.verify|verify} messages.
         * @param message Entry message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: keyserver.IEntry, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes an Entry message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns Entry
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): keyserver.Entry;

        /**
         * Decodes an Entry message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns Entry
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): keyserver.Entry;

        /**
         * Verifies an Entry message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates an Entry message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns Entry
         */
        public static fromObject(object: { [k: string]: any }): keyserver.Entry;

        /**
         * Creates a plain object from an Entry message. Also converts values to other types if specified.
         * @param message Entry
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: keyserver.Entry, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this Entry to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for Entry
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of an AddressMetadata. */
    interface IAddressMetadata {

        /** AddressMetadata timestamp */
        timestamp?: (number|Long|null);

        /** AddressMetadata ttl */
        ttl?: (number|Long|null);

        /** AddressMetadata entries */
        entries?: (keyserver.IEntry[]|null);
    }

    /** Represents an AddressMetadata. */
    class AddressMetadata implements IAddressMetadata {

        /**
         * Constructs a new AddressMetadata.
         * @param [properties] Properties to set
         */
        constructor(properties?: keyserver.IAddressMetadata);

        /** AddressMetadata timestamp. */
        public timestamp: (number|Long);

        /** AddressMetadata ttl. */
        public ttl: (number|Long);

        /** AddressMetadata entries. */
        public entries: keyserver.IEntry[];

        /**
         * Creates a new AddressMetadata instance using the specified properties.
         * @param [properties] Properties to set
         * @returns AddressMetadata instance
         */
        public static create(properties?: keyserver.IAddressMetadata): keyserver.AddressMetadata;

        /**
         * Encodes the specified AddressMetadata message. Does not implicitly {@link keyserver.AddressMetadata.verify|verify} messages.
         * @param message AddressMetadata message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: keyserver.IAddressMetadata, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified AddressMetadata message, length delimited. Does not implicitly {@link keyserver.AddressMetadata.verify|verify} messages.
         * @param message AddressMetadata message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: keyserver.IAddressMetadata, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes an AddressMetadata message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns AddressMetadata
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): keyserver.AddressMetadata;

        /**
         * Decodes an AddressMetadata message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns AddressMetadata
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): keyserver.AddressMetadata;

        /**
         * Verifies an AddressMetadata message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates an AddressMetadata message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns AddressMetadata
         */
        public static fromObject(object: { [k: string]: any }): keyserver.AddressMetadata;

        /**
         * Creates a plain object from an AddressMetadata message. Also converts values to other types if specified.
         * @param message AddressMetadata
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: keyserver.AddressMetadata, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this AddressMetadata to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for AddressMetadata
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a Peer. */
    interface IPeer {

        /** Peer url */
        url?: (string|null);
    }

    /** Represents a Peer. */
    class Peer implements IPeer {

        /**
         * Constructs a new Peer.
         * @param [properties] Properties to set
         */
        constructor(properties?: keyserver.IPeer);

        /** Peer url. */
        public url: string;

        /**
         * Creates a new Peer instance using the specified properties.
         * @param [properties] Properties to set
         * @returns Peer instance
         */
        public static create(properties?: keyserver.IPeer): keyserver.Peer;

        /**
         * Encodes the specified Peer message. Does not implicitly {@link keyserver.Peer.verify|verify} messages.
         * @param message Peer message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: keyserver.IPeer, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified Peer message, length delimited. Does not implicitly {@link keyserver.Peer.verify|verify} messages.
         * @param message Peer message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: keyserver.IPeer, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a Peer message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns Peer
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): keyserver.Peer;

        /**
         * Decodes a Peer message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns Peer
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): keyserver.Peer;

        /**
         * Verifies a Peer message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a Peer message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns Peer
         */
        public static fromObject(object: { [k: string]: any }): keyserver.Peer;

        /**
         * Creates a plain object from a Peer message. Also converts values to other types if specified.
         * @param message Peer
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: keyserver.Peer, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this Peer to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for Peer
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a Peers. */
    interface IPeers {

        /** Peers peers */
        peers?: (keyserver.IPeer[]|null);
    }

    /** Represents a Peers. */
    class Peers implements IPeers {

        /**
         * Constructs a new Peers.
         * @param [properties] Properties to set
         */
        constructor(properties?: keyserver.IPeers);

        /** Peers peers. */
        public peers: keyserver.IPeer[];

        /**
         * Creates a new Peers instance using the specified properties.
         * @param [properties] Properties to set
         * @returns Peers instance
         */
        public static create(properties?: keyserver.IPeers): keyserver.Peers;

        /**
         * Encodes the specified Peers message. Does not implicitly {@link keyserver.Peers.verify|verify} messages.
         * @param message Peers message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: keyserver.IPeers, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified Peers message, length delimited. Does not implicitly {@link keyserver.Peers.verify|verify} messages.
         * @param message Peers message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: keyserver.IPeers, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a Peers message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns Peers
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): keyserver.Peers;

        /**
         * Decodes a Peers message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns Peers
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): keyserver.Peers;

        /**
         * Verifies a Peers message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a Peers message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns Peers
         */
        public static fromObject(object: { [k: string]: any }): keyserver.Peers;

        /**
         * Creates a plain object from a Peers message. Also converts values to other types if specified.
         * @param message Peers
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: keyserver.Peers, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this Peers to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for Peers
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }
}

/** Namespace wrapper. */
export namespace wrapper {

    /** Properties of a BurnOutputs. */
    interface IBurnOutputs {

        /** BurnOutputs tx */
        tx?: (Uint8Array|null);

        /** BurnOutputs index */
        index?: (number|null);
    }

    /** Represents a BurnOutputs. */
    class BurnOutputs implements IBurnOutputs {

        /**
         * Constructs a new BurnOutputs.
         * @param [properties] Properties to set
         */
        constructor(properties?: wrapper.IBurnOutputs);

        /** BurnOutputs tx. */
        public tx: Uint8Array;

        /** BurnOutputs index. */
        public index: number;

        /**
         * Creates a new BurnOutputs instance using the specified properties.
         * @param [properties] Properties to set
         * @returns BurnOutputs instance
         */
        public static create(properties?: wrapper.IBurnOutputs): wrapper.BurnOutputs;

        /**
         * Encodes the specified BurnOutputs message. Does not implicitly {@link wrapper.BurnOutputs.verify|verify} messages.
         * @param message BurnOutputs message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: wrapper.IBurnOutputs, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified BurnOutputs message, length delimited. Does not implicitly {@link wrapper.BurnOutputs.verify|verify} messages.
         * @param message BurnOutputs message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: wrapper.IBurnOutputs, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a BurnOutputs message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns BurnOutputs
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): wrapper.BurnOutputs;

        /**
         * Decodes a BurnOutputs message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns BurnOutputs
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): wrapper.BurnOutputs;

        /**
         * Verifies a BurnOutputs message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a BurnOutputs message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns BurnOutputs
         */
        public static fromObject(object: { [k: string]: any }): wrapper.BurnOutputs;

        /**
         * Creates a plain object from a BurnOutputs message. Also converts values to other types if specified.
         * @param message BurnOutputs
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: wrapper.BurnOutputs, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this BurnOutputs to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for BurnOutputs
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a SignedPayload. */
    interface ISignedPayload {

        /** SignedPayload publicKey */
        publicKey?: (Uint8Array|null);

        /** SignedPayload signature */
        signature?: (Uint8Array|null);

        /** SignedPayload scheme */
        scheme?: (wrapper.SignedPayload.SignatureScheme|null);

        /** SignedPayload payload */
        payload?: (Uint8Array|null);

        /** SignedPayload payloadDigest */
        payloadDigest?: (Uint8Array|null);

        /** SignedPayload burnAmount */
        burnAmount?: (number|Long|null);

        /** SignedPayload transactions */
        transactions?: (wrapper.IBurnOutputs[]|null);
    }

    /** Represents a SignedPayload. */
    class SignedPayload implements ISignedPayload {

        /**
         * Constructs a new SignedPayload.
         * @param [properties] Properties to set
         */
        constructor(properties?: wrapper.ISignedPayload);

        /** SignedPayload publicKey. */
        public publicKey: Uint8Array;

        /** SignedPayload signature. */
        public signature: Uint8Array;

        /** SignedPayload scheme. */
        public scheme: wrapper.SignedPayload.SignatureScheme;

        /** SignedPayload payload. */
        public payload: Uint8Array;

        /** SignedPayload payloadDigest. */
        public payloadDigest: Uint8Array;

        /** SignedPayload burnAmount. */
        public burnAmount: (number|Long);

        /** SignedPayload transactions. */
        public transactions: wrapper.IBurnOutputs[];

        /**
         * Creates a new SignedPayload instance using the specified properties.
         * @param [properties] Properties to set
         * @returns SignedPayload instance
         */
        public static create(properties?: wrapper.ISignedPayload): wrapper.SignedPayload;

        /**
         * Encodes the specified SignedPayload message. Does not implicitly {@link wrapper.SignedPayload.verify|verify} messages.
         * @param message SignedPayload message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: wrapper.ISignedPayload, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified SignedPayload message, length delimited. Does not implicitly {@link wrapper.SignedPayload.verify|verify} messages.
         * @param message SignedPayload message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: wrapper.ISignedPayload, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a SignedPayload message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns SignedPayload
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): wrapper.SignedPayload;

        /**
         * Decodes a SignedPayload message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns SignedPayload
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): wrapper.SignedPayload;

        /**
         * Verifies a SignedPayload message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a SignedPayload message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns SignedPayload
         */
        public static fromObject(object: { [k: string]: any }): wrapper.SignedPayload;

        /**
         * Creates a plain object from a SignedPayload message. Also converts values to other types if specified.
         * @param message SignedPayload
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: wrapper.SignedPayload, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this SignedPayload to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for SignedPayload
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    namespace SignedPayload {

        /** SignatureScheme enum. */
        enum SignatureScheme {
            SCHNORR = 0,
            ECDSA = 1
        }
    }

    /** Properties of a SignedPayloadSet. */
    interface ISignedPayloadSet {

        /** SignedPayloadSet items */
        items?: (wrapper.ISignedPayload[]|null);
    }

    /** Represents a SignedPayloadSet. */
    class SignedPayloadSet implements ISignedPayloadSet {

        /**
         * Constructs a new SignedPayloadSet.
         * @param [properties] Properties to set
         */
        constructor(properties?: wrapper.ISignedPayloadSet);

        /** SignedPayloadSet items. */
        public items: wrapper.ISignedPayload[];

        /**
         * Creates a new SignedPayloadSet instance using the specified properties.
         * @param [properties] Properties to set
         * @returns SignedPayloadSet instance
         */
        public static create(properties?: wrapper.ISignedPayloadSet): wrapper.SignedPayloadSet;

        /**
         * Encodes the specified SignedPayloadSet message. Does not implicitly {@link wrapper.SignedPayloadSet.verify|verify} messages.
         * @param message SignedPayloadSet message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: wrapper.ISignedPayloadSet, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified SignedPayloadSet message, length delimited. Does not implicitly {@link wrapper.SignedPayloadSet.verify|verify} messages.
         * @param message SignedPayloadSet message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: wrapper.ISignedPayloadSet, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a SignedPayloadSet message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns SignedPayloadSet
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): wrapper.SignedPayloadSet;

        /**
         * Decodes a SignedPayloadSet message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns SignedPayloadSet
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): wrapper.SignedPayloadSet;

        /**
         * Verifies a SignedPayloadSet message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a SignedPayloadSet message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns SignedPayloadSet
         */
        public static fromObject(object: { [k: string]: any }): wrapper.SignedPayloadSet;

        /**
         * Creates a plain object from a SignedPayloadSet message. Also converts values to other types if specified.
         * @param message SignedPayloadSet
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: wrapper.SignedPayloadSet, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this SignedPayloadSet to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for SignedPayloadSet
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }
}

/** Namespace filters. */
export namespace filters {

    /** Properties of a PriceFilter. */
    interface IPriceFilter {

        /** PriceFilter public */
        "public"?: (boolean|null);

        /** PriceFilter acceptancePrice */
        acceptancePrice?: (number|Long|null);

        /** PriceFilter notificationPrice */
        notificationPrice?: (number|Long|null);
    }

    /** Represents a PriceFilter. */
    class PriceFilter implements IPriceFilter {

        /**
         * Constructs a new PriceFilter.
         * @param [properties] Properties to set
         */
        constructor(properties?: filters.IPriceFilter);

        /** PriceFilter public. */
        public public: boolean;

        /** PriceFilter acceptancePrice. */
        public acceptancePrice: (number|Long);

        /** PriceFilter notificationPrice. */
        public notificationPrice: (number|Long);

        /**
         * Creates a new PriceFilter instance using the specified properties.
         * @param [properties] Properties to set
         * @returns PriceFilter instance
         */
        public static create(properties?: filters.IPriceFilter): filters.PriceFilter;

        /**
         * Encodes the specified PriceFilter message. Does not implicitly {@link filters.PriceFilter.verify|verify} messages.
         * @param message PriceFilter message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: filters.IPriceFilter, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified PriceFilter message, length delimited. Does not implicitly {@link filters.PriceFilter.verify|verify} messages.
         * @param message PriceFilter message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: filters.IPriceFilter, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a PriceFilter message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns PriceFilter
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): filters.PriceFilter;

        /**
         * Decodes a PriceFilter message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns PriceFilter
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): filters.PriceFilter;

        /**
         * Verifies a PriceFilter message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a PriceFilter message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns PriceFilter
         */
        public static fromObject(object: { [k: string]: any }): filters.PriceFilter;

        /**
         * Creates a plain object from a PriceFilter message. Also converts values to other types if specified.
         * @param message PriceFilter
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: filters.PriceFilter, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this PriceFilter to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for PriceFilter
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a Filters. */
    interface IFilters {

        /** Filters priceFilter */
        priceFilter?: (filters.IPriceFilter|null);
    }

    /** Represents a Filters. */
    class Filters implements IFilters {

        /**
         * Constructs a new Filters.
         * @param [properties] Properties to set
         */
        constructor(properties?: filters.IFilters);

        /** Filters priceFilter. */
        public priceFilter?: (filters.IPriceFilter|null);

        /**
         * Creates a new Filters instance using the specified properties.
         * @param [properties] Properties to set
         * @returns Filters instance
         */
        public static create(properties?: filters.IFilters): filters.Filters;

        /**
         * Encodes the specified Filters message. Does not implicitly {@link filters.Filters.verify|verify} messages.
         * @param message Filters message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: filters.IFilters, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified Filters message, length delimited. Does not implicitly {@link filters.Filters.verify|verify} messages.
         * @param message Filters message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: filters.IFilters, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a Filters message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns Filters
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): filters.Filters;

        /**
         * Decodes a Filters message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns Filters
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): filters.Filters;

        /**
         * Verifies a Filters message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a Filters message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns Filters
         */
        public static fromObject(object: { [k: string]: any }): filters.Filters;

        /**
         * Creates a plain object from a Filters message. Also converts values to other types if specified.
         * @param message Filters
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: filters.Filters, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this Filters to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for Filters
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }
}

/** Namespace p2pkh. */
export namespace p2pkh {

    /** Properties of a P2PKHEntry. */
    interface IP2PKHEntry {

        /** P2PKHEntry transaction */
        transaction?: (Uint8Array|null);
    }

    /** Represents a P2PKHEntry. */
    class P2PKHEntry implements IP2PKHEntry {

        /**
         * Constructs a new P2PKHEntry.
         * @param [properties] Properties to set
         */
        constructor(properties?: p2pkh.IP2PKHEntry);

        /** P2PKHEntry transaction. */
        public transaction: Uint8Array;

        /**
         * Creates a new P2PKHEntry instance using the specified properties.
         * @param [properties] Properties to set
         * @returns P2PKHEntry instance
         */
        public static create(properties?: p2pkh.IP2PKHEntry): p2pkh.P2PKHEntry;

        /**
         * Encodes the specified P2PKHEntry message. Does not implicitly {@link p2pkh.P2PKHEntry.verify|verify} messages.
         * @param message P2PKHEntry message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: p2pkh.IP2PKHEntry, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified P2PKHEntry message, length delimited. Does not implicitly {@link p2pkh.P2PKHEntry.verify|verify} messages.
         * @param message P2PKHEntry message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: p2pkh.IP2PKHEntry, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a P2PKHEntry message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns P2PKHEntry
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): p2pkh.P2PKHEntry;

        /**
         * Decodes a P2PKHEntry message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns P2PKHEntry
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): p2pkh.P2PKHEntry;

        /**
         * Verifies a P2PKHEntry message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a P2PKHEntry message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns P2PKHEntry
         */
        public static fromObject(object: { [k: string]: any }): p2pkh.P2PKHEntry;

        /**
         * Creates a plain object from a P2PKHEntry message. Also converts values to other types if specified.
         * @param message P2PKHEntry
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: p2pkh.P2PKHEntry, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this P2PKHEntry to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for P2PKHEntry
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }
}

/** Namespace broadcast. */
export namespace broadcast {

    /** Properties of a ForumPost. */
    interface IForumPost {

        /** ForumPost title */
        title?: (string|null);

        /** ForumPost url */
        url?: (string|null);

        /** ForumPost message */
        message?: (string|null);
    }

    /** Represents a ForumPost. */
    class ForumPost implements IForumPost {

        /**
         * Constructs a new ForumPost.
         * @param [properties] Properties to set
         */
        constructor(properties?: broadcast.IForumPost);

        /** ForumPost title. */
        public title: string;

        /** ForumPost url. */
        public url: string;

        /** ForumPost message. */
        public message: string;

        /**
         * Creates a new ForumPost instance using the specified properties.
         * @param [properties] Properties to set
         * @returns ForumPost instance
         */
        public static create(properties?: broadcast.IForumPost): broadcast.ForumPost;

        /**
         * Encodes the specified ForumPost message. Does not implicitly {@link broadcast.ForumPost.verify|verify} messages.
         * @param message ForumPost message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: broadcast.IForumPost, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified ForumPost message, length delimited. Does not implicitly {@link broadcast.ForumPost.verify|verify} messages.
         * @param message ForumPost message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: broadcast.IForumPost, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a ForumPost message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns ForumPost
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): broadcast.ForumPost;

        /**
         * Decodes a ForumPost message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns ForumPost
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): broadcast.ForumPost;

        /**
         * Verifies a ForumPost message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a ForumPost message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns ForumPost
         */
        public static fromObject(object: { [k: string]: any }): broadcast.ForumPost;

        /**
         * Creates a plain object from a ForumPost message. Also converts values to other types if specified.
         * @param message ForumPost
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: broadcast.ForumPost, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this ForumPost to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for ForumPost
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a BroadcastEntry. */
    interface IBroadcastEntry {

        /** BroadcastEntry kind */
        kind?: (string|null);

        /** BroadcastEntry headers */
        headers?: ({ [k: string]: string }|null);

        /** BroadcastEntry payload */
        payload?: (Uint8Array|null);
    }

    /** Represents a BroadcastEntry. */
    class BroadcastEntry implements IBroadcastEntry {

        /**
         * Constructs a new BroadcastEntry.
         * @param [properties] Properties to set
         */
        constructor(properties?: broadcast.IBroadcastEntry);

        /** BroadcastEntry kind. */
        public kind: string;

        /** BroadcastEntry headers. */
        public headers: { [k: string]: string };

        /** BroadcastEntry payload. */
        public payload: Uint8Array;

        /**
         * Creates a new BroadcastEntry instance using the specified properties.
         * @param [properties] Properties to set
         * @returns BroadcastEntry instance
         */
        public static create(properties?: broadcast.IBroadcastEntry): broadcast.BroadcastEntry;

        /**
         * Encodes the specified BroadcastEntry message. Does not implicitly {@link broadcast.BroadcastEntry.verify|verify} messages.
         * @param message BroadcastEntry message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: broadcast.IBroadcastEntry, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified BroadcastEntry message, length delimited. Does not implicitly {@link broadcast.BroadcastEntry.verify|verify} messages.
         * @param message BroadcastEntry message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: broadcast.IBroadcastEntry, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a BroadcastEntry message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns BroadcastEntry
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): broadcast.BroadcastEntry;

        /**
         * Decodes a BroadcastEntry message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns BroadcastEntry
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): broadcast.BroadcastEntry;

        /**
         * Verifies a BroadcastEntry message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a BroadcastEntry message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns BroadcastEntry
         */
        public static fromObject(object: { [k: string]: any }): broadcast.BroadcastEntry;

        /**
         * Creates a plain object from a BroadcastEntry message. Also converts values to other types if specified.
         * @param message BroadcastEntry
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: broadcast.BroadcastEntry, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this BroadcastEntry to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for BroadcastEntry
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a BroadcastMessage. */
    interface IBroadcastMessage {

        /** BroadcastMessage topic */
        topic?: (string|null);

        /** BroadcastMessage timestamp */
        timestamp?: (number|Long|null);

        /** BroadcastMessage entries */
        entries?: (broadcast.IBroadcastEntry[]|null);

        /** BroadcastMessage parentDigest */
        parentDigest?: (Uint8Array|null);
    }

    /** Represents a BroadcastMessage. */
    class BroadcastMessage implements IBroadcastMessage {

        /**
         * Constructs a new BroadcastMessage.
         * @param [properties] Properties to set
         */
        constructor(properties?: broadcast.IBroadcastMessage);

        /** BroadcastMessage topic. */
        public topic: string;

        /** BroadcastMessage timestamp. */
        public timestamp: (number|Long);

        /** BroadcastMessage entries. */
        public entries: broadcast.IBroadcastEntry[];

        /** BroadcastMessage parentDigest. */
        public parentDigest: Uint8Array;

        /**
         * Creates a new BroadcastMessage instance using the specified properties.
         * @param [properties] Properties to set
         * @returns BroadcastMessage instance
         */
        public static create(properties?: broadcast.IBroadcastMessage): broadcast.BroadcastMessage;

        /**
         * Encodes the specified BroadcastMessage message. Does not implicitly {@link broadcast.BroadcastMessage.verify|verify} messages.
         * @param message BroadcastMessage message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: broadcast.IBroadcastMessage, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified BroadcastMessage message, length delimited. Does not implicitly {@link broadcast.BroadcastMessage.verify|verify} messages.
         * @param message BroadcastMessage message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: broadcast.IBroadcastMessage, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a BroadcastMessage message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns BroadcastMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): broadcast.BroadcastMessage;

        /**
         * Decodes a BroadcastMessage message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns BroadcastMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): broadcast.BroadcastMessage;

        /**
         * Verifies a BroadcastMessage message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a BroadcastMessage message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns BroadcastMessage
         */
        public static fromObject(object: { [k: string]: any }): broadcast.BroadcastMessage;

        /**
         * Creates a plain object from a BroadcastMessage message. Also converts values to other types if specified.
         * @param message BroadcastMessage
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: broadcast.BroadcastMessage, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this BroadcastMessage to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for BroadcastMessage
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }
}

/** Namespace bip70. */
export namespace bip70 {

    /** Properties of an Output. */
    interface IOutput {

        /** Output amount */
        amount?: (number|Long|null);

        /** Output script */
        script: Uint8Array;
    }

    /** Represents an Output. */
    class Output implements IOutput {

        /**
         * Constructs a new Output.
         * @param [properties] Properties to set
         */
        constructor(properties?: bip70.IOutput);

        /** Output amount. */
        public amount: (number|Long);

        /** Output script. */
        public script: Uint8Array;

        /**
         * Creates a new Output instance using the specified properties.
         * @param [properties] Properties to set
         * @returns Output instance
         */
        public static create(properties?: bip70.IOutput): bip70.Output;

        /**
         * Encodes the specified Output message. Does not implicitly {@link bip70.Output.verify|verify} messages.
         * @param message Output message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: bip70.IOutput, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified Output message, length delimited. Does not implicitly {@link bip70.Output.verify|verify} messages.
         * @param message Output message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: bip70.IOutput, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes an Output message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns Output
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): bip70.Output;

        /**
         * Decodes an Output message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns Output
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): bip70.Output;

        /**
         * Verifies an Output message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates an Output message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns Output
         */
        public static fromObject(object: { [k: string]: any }): bip70.Output;

        /**
         * Creates a plain object from an Output message. Also converts values to other types if specified.
         * @param message Output
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: bip70.Output, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this Output to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for Output
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a PaymentDetails. */
    interface IPaymentDetails {

        /** PaymentDetails network */
        network?: (string|null);

        /** PaymentDetails outputs */
        outputs?: (bip70.IOutput[]|null);

        /** PaymentDetails time */
        time: (number|Long);

        /** PaymentDetails expires */
        expires?: (number|Long|null);

        /** PaymentDetails memo */
        memo?: (string|null);

        /** PaymentDetails paymentUrl */
        paymentUrl?: (string|null);

        /** PaymentDetails merchantData */
        merchantData?: (Uint8Array|null);
    }

    /** Represents a PaymentDetails. */
    class PaymentDetails implements IPaymentDetails {

        /**
         * Constructs a new PaymentDetails.
         * @param [properties] Properties to set
         */
        constructor(properties?: bip70.IPaymentDetails);

        /** PaymentDetails network. */
        public network: string;

        /** PaymentDetails outputs. */
        public outputs: bip70.IOutput[];

        /** PaymentDetails time. */
        public time: (number|Long);

        /** PaymentDetails expires. */
        public expires: (number|Long);

        /** PaymentDetails memo. */
        public memo: string;

        /** PaymentDetails paymentUrl. */
        public paymentUrl: string;

        /** PaymentDetails merchantData. */
        public merchantData: Uint8Array;

        /**
         * Creates a new PaymentDetails instance using the specified properties.
         * @param [properties] Properties to set
         * @returns PaymentDetails instance
         */
        public static create(properties?: bip70.IPaymentDetails): bip70.PaymentDetails;

        /**
         * Encodes the specified PaymentDetails message. Does not implicitly {@link bip70.PaymentDetails.verify|verify} messages.
         * @param message PaymentDetails message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: bip70.IPaymentDetails, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified PaymentDetails message, length delimited. Does not implicitly {@link bip70.PaymentDetails.verify|verify} messages.
         * @param message PaymentDetails message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: bip70.IPaymentDetails, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a PaymentDetails message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns PaymentDetails
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): bip70.PaymentDetails;

        /**
         * Decodes a PaymentDetails message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns PaymentDetails
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): bip70.PaymentDetails;

        /**
         * Verifies a PaymentDetails message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a PaymentDetails message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns PaymentDetails
         */
        public static fromObject(object: { [k: string]: any }): bip70.PaymentDetails;

        /**
         * Creates a plain object from a PaymentDetails message. Also converts values to other types if specified.
         * @param message PaymentDetails
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: bip70.PaymentDetails, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this PaymentDetails to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for PaymentDetails
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a PaymentRequest. */
    interface IPaymentRequest {

        /** PaymentRequest paymentDetailsVersion */
        paymentDetailsVersion?: (number|null);

        /** PaymentRequest pkiType */
        pkiType?: (string|null);

        /** PaymentRequest pkiData */
        pkiData?: (Uint8Array|null);

        /** PaymentRequest serializedPaymentDetails */
        serializedPaymentDetails: Uint8Array;

        /** PaymentRequest signature */
        signature?: (Uint8Array|null);
    }

    /** Represents a PaymentRequest. */
    class PaymentRequest implements IPaymentRequest {

        /**
         * Constructs a new PaymentRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: bip70.IPaymentRequest);

        /** PaymentRequest paymentDetailsVersion. */
        public paymentDetailsVersion: number;

        /** PaymentRequest pkiType. */
        public pkiType: string;

        /** PaymentRequest pkiData. */
        public pkiData: Uint8Array;

        /** PaymentRequest serializedPaymentDetails. */
        public serializedPaymentDetails: Uint8Array;

        /** PaymentRequest signature. */
        public signature: Uint8Array;

        /**
         * Creates a new PaymentRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns PaymentRequest instance
         */
        public static create(properties?: bip70.IPaymentRequest): bip70.PaymentRequest;

        /**
         * Encodes the specified PaymentRequest message. Does not implicitly {@link bip70.PaymentRequest.verify|verify} messages.
         * @param message PaymentRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: bip70.IPaymentRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified PaymentRequest message, length delimited. Does not implicitly {@link bip70.PaymentRequest.verify|verify} messages.
         * @param message PaymentRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: bip70.IPaymentRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a PaymentRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns PaymentRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): bip70.PaymentRequest;

        /**
         * Decodes a PaymentRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns PaymentRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): bip70.PaymentRequest;

        /**
         * Verifies a PaymentRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a PaymentRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns PaymentRequest
         */
        public static fromObject(object: { [k: string]: any }): bip70.PaymentRequest;

        /**
         * Creates a plain object from a PaymentRequest message. Also converts values to other types if specified.
         * @param message PaymentRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: bip70.PaymentRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this PaymentRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for PaymentRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a X509Certificates. */
    interface IX509Certificates {

        /** X509Certificates certificate */
        certificate?: (Uint8Array[]|null);
    }

    /** Represents a X509Certificates. */
    class X509Certificates implements IX509Certificates {

        /**
         * Constructs a new X509Certificates.
         * @param [properties] Properties to set
         */
        constructor(properties?: bip70.IX509Certificates);

        /** X509Certificates certificate. */
        public certificate: Uint8Array[];

        /**
         * Creates a new X509Certificates instance using the specified properties.
         * @param [properties] Properties to set
         * @returns X509Certificates instance
         */
        public static create(properties?: bip70.IX509Certificates): bip70.X509Certificates;

        /**
         * Encodes the specified X509Certificates message. Does not implicitly {@link bip70.X509Certificates.verify|verify} messages.
         * @param message X509Certificates message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: bip70.IX509Certificates, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified X509Certificates message, length delimited. Does not implicitly {@link bip70.X509Certificates.verify|verify} messages.
         * @param message X509Certificates message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: bip70.IX509Certificates, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a X509Certificates message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns X509Certificates
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): bip70.X509Certificates;

        /**
         * Decodes a X509Certificates message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns X509Certificates
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): bip70.X509Certificates;

        /**
         * Verifies a X509Certificates message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a X509Certificates message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns X509Certificates
         */
        public static fromObject(object: { [k: string]: any }): bip70.X509Certificates;

        /**
         * Creates a plain object from a X509Certificates message. Also converts values to other types if specified.
         * @param message X509Certificates
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: bip70.X509Certificates, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this X509Certificates to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for X509Certificates
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a Payment. */
    interface IPayment {

        /** Payment merchantData */
        merchantData?: (Uint8Array|null);

        /** Payment transactions */
        transactions?: (Uint8Array[]|null);

        /** Payment refundTo */
        refundTo?: (bip70.IOutput[]|null);

        /** Payment memo */
        memo?: (string|null);
    }

    /** Represents a Payment. */
    class Payment implements IPayment {

        /**
         * Constructs a new Payment.
         * @param [properties] Properties to set
         */
        constructor(properties?: bip70.IPayment);

        /** Payment merchantData. */
        public merchantData: Uint8Array;

        /** Payment transactions. */
        public transactions: Uint8Array[];

        /** Payment refundTo. */
        public refundTo: bip70.IOutput[];

        /** Payment memo. */
        public memo: string;

        /**
         * Creates a new Payment instance using the specified properties.
         * @param [properties] Properties to set
         * @returns Payment instance
         */
        public static create(properties?: bip70.IPayment): bip70.Payment;

        /**
         * Encodes the specified Payment message. Does not implicitly {@link bip70.Payment.verify|verify} messages.
         * @param message Payment message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: bip70.IPayment, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified Payment message, length delimited. Does not implicitly {@link bip70.Payment.verify|verify} messages.
         * @param message Payment message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: bip70.IPayment, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a Payment message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns Payment
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): bip70.Payment;

        /**
         * Decodes a Payment message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns Payment
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): bip70.Payment;

        /**
         * Verifies a Payment message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a Payment message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns Payment
         */
        public static fromObject(object: { [k: string]: any }): bip70.Payment;

        /**
         * Creates a plain object from a Payment message. Also converts values to other types if specified.
         * @param message Payment
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: bip70.Payment, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this Payment to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for Payment
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a PaymentACK. */
    interface IPaymentACK {

        /** PaymentACK payment */
        payment: bip70.IPayment;

        /** PaymentACK memo */
        memo?: (string|null);
    }

    /** Represents a PaymentACK. */
    class PaymentACK implements IPaymentACK {

        /**
         * Constructs a new PaymentACK.
         * @param [properties] Properties to set
         */
        constructor(properties?: bip70.IPaymentACK);

        /** PaymentACK payment. */
        public payment: bip70.IPayment;

        /** PaymentACK memo. */
        public memo: string;

        /**
         * Creates a new PaymentACK instance using the specified properties.
         * @param [properties] Properties to set
         * @returns PaymentACK instance
         */
        public static create(properties?: bip70.IPaymentACK): bip70.PaymentACK;

        /**
         * Encodes the specified PaymentACK message. Does not implicitly {@link bip70.PaymentACK.verify|verify} messages.
         * @param message PaymentACK message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: bip70.IPaymentACK, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified PaymentACK message, length delimited. Does not implicitly {@link bip70.PaymentACK.verify|verify} messages.
         * @param message PaymentACK message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: bip70.IPaymentACK, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a PaymentACK message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns PaymentACK
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): bip70.PaymentACK;

        /**
         * Decodes a PaymentACK message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns PaymentACK
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): bip70.PaymentACK;

        /**
         * Verifies a PaymentACK message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a PaymentACK message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns PaymentACK
         */
        public static fromObject(object: { [k: string]: any }): bip70.PaymentACK;

        /**
         * Creates a plain object from a PaymentACK message. Also converts values to other types if specified.
         * @param message PaymentACK
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: bip70.PaymentACK, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this PaymentACK to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for PaymentACK
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }
}
