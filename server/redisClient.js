const net = require("net");

class RedisClient {
    constructor() {
        this.host = process.env.REDIS_HOST || "localhost";
        this.port = Number.parseInt(process.env.REDIS_PORT || "6379");
        this.socket = null;
        this.isConnected = false;
        this.commandQueue = [];
        this.responseBuffer = Buffer.alloc(0);
        this.keyRegistry = "__all_keys__";
    }

    // ------------------- Encoding / Decoding -------------------
    encodeCommand(args) {
        let command = `*${args.length}\r\n`;
        for (const arg of args) {
            const str = String(arg);
            command += `$${Buffer.byteLength(str)}\r\n${str}\r\n`;
        }
        return command;
    }

    parseResponse(buffer) {
        const responses = [];
        let offset = 0;

        while (offset < buffer.length) {
            const type = String.fromCharCode(buffer[offset]);

            if (type === "+") {
                const end = buffer.indexOf("\r\n", offset);
                if (end === -1) break;
                responses.push(buffer.slice(offset + 1, end).toString());
                offset = end + 2;
            } else if (type === "-") {
                const end = buffer.indexOf("\r\n", offset);
                if (end === -1) break;
                const error = buffer.slice(offset + 1, end).toString();
                responses.push(new Error(error));
                offset = end + 2;
            } else if (type === ":") {
                const end = buffer.indexOf("\r\n", offset);
                if (end === -1) break;
                responses.push(
                    Number.parseInt(buffer.slice(offset + 1, end).toString())
                );
                offset = end + 2;
            } else if (type === "$") {
                const lengthEnd = buffer.indexOf("\r\n", offset);
                if (lengthEnd === -1) break;
                const length = Number.parseInt(
                    buffer.slice(offset + 1, lengthEnd).toString()
                );
                if (length === -1) {
                    responses.push(null);
                    offset = lengthEnd + 2;
                } else {
                    const dataStart = lengthEnd + 2;
                    const dataEnd = dataStart + length;
                    if (dataEnd + 2 > buffer.length) break;
                    responses.push(buffer.slice(dataStart, dataEnd).toString());
                    offset = dataEnd + 2;
                }
            } else if (type === "*") {
                const lengthEnd = buffer.indexOf("\r\n", offset);
                if (lengthEnd === -1) break;
                const arrayLength = Number.parseInt(
                    buffer.slice(offset + 1, lengthEnd).toString()
                );
                const arrayItems = [];
                offset = lengthEnd + 2;

                for (let i = 0; i < arrayLength; i++) {
                    if (offset >= buffer.length)
                        return { responses, remaining: buffer.slice(offset) };
                    const itemType = String.fromCharCode(buffer[offset]);

                    if (itemType === "$") {
                        const itemLengthEnd = buffer.indexOf("\r\n", offset);
                        if (itemLengthEnd === -1)
                            return {
                                responses,
                                remaining: buffer.slice(offset),
                            };
                        const itemLength = Number.parseInt(
                            buffer.slice(offset + 1, itemLengthEnd).toString()
                        );
                        if (itemLength === -1) {
                            arrayItems.push(null);
                            offset = itemLengthEnd + 2;
                        } else {
                            const itemDataStart = itemLengthEnd + 2;
                            const itemDataEnd = itemDataStart + itemLength;
                            if (itemDataEnd + 2 > buffer.length)
                                return {
                                    responses,
                                    remaining: buffer.slice(offset),
                                };
                            arrayItems.push(
                                buffer
                                    .slice(itemDataStart, itemDataEnd)
                                    .toString()
                            );
                            offset = itemDataEnd + 2;
                        }
                    }
                }
                responses.push(arrayItems);
            } else {
                offset++;
            }
        }

        return { responses, remaining: Buffer.alloc(0) };
    }

    // ------------------- Connection Handling -------------------
    async connect() {
        if (this.isConnected) return;

        return new Promise((resolve, reject) => {
            this.socket = net.createConnection(this.port, this.host);

            this.socket.on("connect", () => {
                console.log("Connected to Redis-like server");
                this.isConnected = true;
                resolve();
            });

            this.socket.on("data", (data) => {
                this.responseBuffer = Buffer.concat([
                    this.responseBuffer,
                    data,
                ]);
                const { responses, remaining } = this.parseResponse(
                    this.responseBuffer
                );
                this.responseBuffer = remaining;

                responses.forEach((response) => {
                    const pending = this.commandQueue.shift();
                    if (pending) {
                        if (response instanceof Error) {
                            pending.reject(response);
                        } else {
                            pending.resolve(response);
                        }
                    }
                });
            });

            this.socket.on("error", (error) => {
                console.error("Redis connection error:", error);
                this.isConnected = false;
                reject(error);
            });

            this.socket.on("close", () => {
                console.log("Redis connection closed");
                this.isConnected = false;
            });
        });
    }

    async disconnect() {
        if (this.socket) {
            this.socket.end();
            this.isConnected = false;
        }
    }

    // ------------------- Command Execution -------------------
    async executeCommand(args) {
        return new Promise((resolve, reject) => {
            if (!this.isConnected) {
                this.connect()
                    .then(() =>
                        this.executeCommand(args).then(resolve).catch(reject)
                    )
                    .catch(reject);
                return;
            }

            const command = this.encodeCommand(args);
            this.commandQueue.push({ resolve, reject });
            this.socket.write(command);
        });
    }

    // ------------------- Enhanced Operations -------------------
    async set(key, value, type = "string") {
        try {
            let result;

            if (type === "json") {
                result = await this.executeCommand([
                    "JSON.SET",
                    key,
                    // "$",
                    JSON.stringify(value),
                ]);
            } else if (type === "hash") {
                // assume value is an object { field: val }
                const fields = [];
                for (const f in value) fields.push(f, value[f]);
                result = await this.executeCommand(["HSET", key, ...fields]);
            } else if (type === "set") {
                result = await this.executeCommand(["SADD", key, ...value]);
            } else if (type === "list") {
                result = await this.executeCommand(["LPUSH", key, ...value]);
            } else if (type === "zset") {
                result = await this.executeCommand([
                    "ZADD",
                    key,
                    ...value.flatMap((i) => [i.score, i.member]),
                ]);
            } else if (type === "vector") {
                result = await this.executeCommand(["VSET", key, ...value]);
            } else if (type === "doc") {
                result = await this.executeCommand(["DOCSET", key, value]);
            } else {
                result = await this.executeCommand(["SET", key, value]);
            }

            await this.executeCommand(["SADD", this.keyRegistry, key]);
            return result === "OK" || typeof result === "number";
        } catch (error) {
            console.error(`Redis ${type.toUpperCase()} SET error:`, error);
            return false;
        }
    }

    async get(key, type = "string") {
        try {
            if (type === "json") {
                const jsonString = await this.executeCommand(["JSON.GET", key]);
                console.log('✅jsonString', jsonString);
                return JSON.parse(jsonString);
            } else if (type === "hash") {
                const array = await this.executeCommand(["HGETALL", key]);
                const obj = {};
                for (let i = 0; i < array.length; i += 2) {
                    obj[array[i]] = array[i + 1];
                }
                return obj;
            } else if (type === "set") {
                return await this.executeCommand(["SMEMBERS", key]);
            } else {
                return await this.executeCommand(["GET", key]);
            }
        } catch (error) {
            console.error("Redis GET error:", error);
            return null;
        }
    }

    async del(key) {
        try {
            const deletedCount = await this.executeCommand(["DEL", key]);
            await this.executeCommand(["SREM", this.keyRegistry, key]);
            return deletedCount;
        } catch (error) {
            console.error("Redis DEL error:", error);
            return 0;
        }
    }

    // New method to get the type of a key
    async type(key) {
        try {
            return await this.executeCommand(["TYPE", key]);
        } catch (error) {
            console.error("Redis TYPE error:", error);
            return "none";
        }
    }

    async getAllData() {
        try {
            const keys = await this.executeCommand(["KEYS", this.keyRegistry]);
            const result = [];
            for (const key of keys) {
                const keyType = await this.type(key);
                let value;
                if (keyType === "string") {
                    value = await this.get(key, "string");
                } else if (keyType === "hash") {
                    value = await this.get(key, "hash");
                } else if (keyType === "set") {
                    value = await this.get(key, "set");
                } else if (keyType === "json") {
                    // JSON keys show this type
                    value = await this.get(key, "json");
                } else if (keyType === "list") {
                    value = await this.get(key, "list");
                } else if (keyType === "zset") {
                    value = await this.get(key, "zset");
                } else if (keyType === "vector") {
                    value = await this.get(key, "vector");
                } else if (keyType === "doc") {
                    value = await this.get(key, "doc");
                }
                result.push({ key, value, type: keyType });
            }
            return result;
        } catch (error) {
            console.error("Redis GET ALL error:", error);
            return [];
        }
    }

    async exists(key) {
        try {
            return (await this.executeCommand(["EXISTS", key])) === 1;
        } catch (error) {
            console.error("Redis EXISTS error:", error);
            return false;
        }
    }

    async ttl(key) {
        try {
            return await this.executeCommand(["TTL", key]);
        } catch (error) {
            console.error("Redis TTL error:", error);
            return -1;
        }
    }

    // ------------------- New methods for Edit Actions -------------------

    async append(key, value) {
        return await this.executeCommand(["APPEND", key, value]);
    }

    async incr(key) {
        return await this.executeCommand(["INCR", key]);
    }

    async decr(key) {
        return await this.executeCommand(["DECR", key]);
    }

    async incrby(key, value) {
        return await this.executeCommand(["INCRBY", key, value]);
    }

    async decrby(key, value) {
        return await this.executeCommand(["DECRBY", key, value]);
    }

    async setrange(key, offset, value) {
        return await this.executeCommand(["SETRANGE", key, offset, value]);
    }

    async getrange(key, startStr, endStr) {
        return await this.executeCommand(["GETRANGE", key, startStr, endStr]);
    }

    async strlen(key) {
        return await this.executeCommand(["STRLEN", key]);
    }

    async jsonArrAppend(key, path, value) {
        return await this.executeCommand(["JSON.ARRAPPEND", key, path, value]);
    }

    async lpush(key, members) {
        return await this.executeCommand(["LPUSH", key, ...members]);
    }

    async rpush(key, members) {
        return await this.executeCommand(["RPUSH", key, ...members]);
    }

    async lpop(key) {
        return await this.executeCommand(["LPOP", key]);
    }

    async rpop(key) {
        return await this.executeCommand(["RPOP", key]);
    }

    async lset(key, index, value) {
        return await this.executeCommand(["LSET", key, index, value]);
    }

    async lrange(key, start, end) {
        return await this.executeCommand(["LRANGE", key, start, end]);
    }

    async lindex(key, index) {
        return await this.executeCommand(["LINDEX", key, index]);
    }

    async sadd(key, members) {
        return await this.executeCommand(["SADD", key, ...members]);
    }

    async srem(key, members) {
        return await this.executeCommand(["SREM", key, ...members]);
    }

    async sismember(key, member) {
        return await this.executeCommand(["SISMEMBER", key, member]);
    }

    async smembers(key) {
        return await this.executeCommand(["SMEMBERS", key]);
    }

    async sinter(keys) {
        return await this.executeCommand(["SINTER", ...keys]);
    }

    async sunion(keys) {
        return await this.executeCommand(["SUNION", ...keys]);
    }

    async sdiff(keys) {
        return await this.executeCommand(["SDIFF", ...keys]);
    }

    async scard(key) {
        return await this.executeCommand(["SCARD", key]);
    }

    async hset(key, pairs) {
        return await this.executeCommand(["HSET", key, ...pairs]);
    }

    async hget(key, field) {
        return await this.executeCommand(["HGET", key, field]);
    }

    async hmset(key, pairs) {
        return await this.executeCommand(["HMSET", key, ...pairs]);
    }

    async hgetall(key) {
        return await this.executeCommand(["HGETALL", key]);
    }

    async hdel(key, fields) {
        return await this.executeCommand(["HDEL", key, ...fields]);
    }

    async hexists(key, field) {
        return await this.executeCommand(["HEXISTS", key, field]);
    }

    async zadd(key, items) {
        return await this.executeCommand([
            "ZADD",
            key,
            ...items.flatMap((i) => [i.score, i.member]),
        ]);
    }

    async zrange(key, start, stop) {
        return await this.executeCommand(["ZRANGE", key, start, stop]);
    }

    async zrank(key, member) {
        return await this.executeCommand(["ZRANK", key, member]);
    }

    async zrem(key, members) {
        return await this.executeCommand(["ZREM", key, ...members]);
    }

    async expire(key, seconds) {
        return await this.executeCommand(["EXPIRE", key, String(seconds)]);
    }

    async execTransaction(commands) {
        // Start with the MULTI command
        let commandString = this.encodeCommand(["MULTI"]);

        // Add each command from the array to the command string
        for (const cmd of commands) {
            commandString += this.encodeCommand(cmd);
        }

        // End with the EXEC command
        commandString += this.encodeCommand(["EXEC"]);

        // Execute the entire sequence as a single command batch
        return new Promise((resolve, reject) => {
            const id = setTimeout(() => reject(new Error("Timeout")), 5000);
            this.commandQueue.push({ resolve, reject, id });
            this.socket.write(commandString);
        });
    }

    async vset(key, vector) {
        return await this.executeCommand(["VSET", key, ...vector.map(String)]);
    }

    async vget(key) {
        return await this.executeCommand(["VGET", key]);
    }

    async vdel(keys) {
        return await this.executeCommand(["VDEL", ...keys]);
    }

    async vsearch(k, metric = "euclidean", query = null, queryKey = null) {
        const args = ["VSEARCH", String(k), metric];
        if (queryKey) args.push(`QUERYKEY:${queryKey}`);
        else args.push(...query.map(String));
        return await this.executeCommand(args);
    }

    async vdot(k1, k2) {
        return await this.executeCommand(["VDOT", k1, k2]);
    }

    async vaddv(dest, k1, k2) {
        return await this.executeCommand(["VADDV", dest, k1, k2]);
    }

    async vsubv(dest, k1, k2) {
        return await this.executeCommand(["VSUBV", dest, k1, k2]);
    }

    async docSet(key, doc) {
        return this.executeCommand(["DOCSET", key, JSON.stringify(doc)]);
    }

    async docGet(key) {
        return this.executeCommand(["DOCGET", key]);
    }

    async docFind(criteria) {
        return this.executeCommand(["DOCFIND", ...criteria]);
    }

    async docUpdate(key, path, value) {
        return this.executeCommand(["DOCUPDATE", key, path, value]);
    }

    async docArrPush(key, path, value) {
        return this.executeCommand(["DOCARRPUSH", key, path, value]);
    }

    async docArrPop(key, path) {
        return this.executeCommand(["DOCARRPOP", key, path]);
    }

    async docCount(field) {
        return this.executeCommand(["DOCCOUNT", field]);
    }

    async docSum(field) {
        return this.executeCommand(["DOCSUM", field]);
    }

    async docAvg(field) {
        return this.executeCommand(["DOCAVG", field]);
    }

    async healthCheck() {
        try {
            const result = await this.executeCommand(["PING"]);
            return result === "PONG";
        } catch (error) {
            console.error("Redis health check failed:", error);
            return false;
        }
    }
}

const redisClient = new RedisClient();

process.on("SIGINT", async () => {
    console.log("Shutting down Redis client...");
    await redisClient.disconnect();
    process.exit(0);
});

process.on("SIGTERM", async () => {
    console.log("Shutting down Redis client...");
    await redisClient.disconnect();
    process.exit(0);
});

module.exports = { redisClient };
