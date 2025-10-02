import { Injectable, Logger } from "@nestjs/common";
import Redis from "ioredis";

@Injectable()
export class RedisService {
  private readonly logger = new Logger(RedisService.name);
  private readonly redisClient: Redis;

  constructor() {
    this.redisClient = new Redis({
      host: process.env.REDIS_HOST || "localhost",
      port: parseInt(process.env.REDIS_PORT || "6379"),
      password: process.env.REDIS_PASSWORD,
      showFriendlyErrorStack: true,
      lazyConnect: true,
      maxRetriesPerRequest: 3,
    });

    this.redisClient.on("error", (error) => {
      this.logger.error(`Redis connection error: ${error.message}`);
    });

    this.redisClient.on("connect", () => {
      this.logger.log("Redis connected successfully");
    });
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.redisClient.get(key);
    } catch (error) {
      this.logger.error(`Redis GET error for key ${key}: ${error.message}`);
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<boolean> {
    try {
      if (ttlSeconds) {
        await this.redisClient.setex(key, ttlSeconds, value);
      } else {
        await this.redisClient.set(key, value);
      }
      return true;
    } catch (error) {
      this.logger.error(`Redis SET error for key ${key}: ${error.message}`);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    try {
      await this.redisClient.del(key);
      return true;
    } catch (error) {
      this.logger.error(`Redis DEL error for key ${key}: ${error.message}`);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redisClient.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`Redis EXISTS error for key ${key}: ${error.message}`);
      return false;
    }
  }

  async hset(key: string, field: string, value: string): Promise<boolean> {
    try {
      await this.redisClient.hset(key, field, value);
      return true;
    } catch (error) {
      this.logger.error(
        `Redis HSET error for key ${key}, field ${field}: ${error.message}`,
      );
      return false;
    }
  }

  async hget(key: string, field: string): Promise<string | null> {
    try {
      return await this.redisClient.hget(key, field);
    } catch (error) {
      this.logger.error(
        `Redis HGET error for key ${key}, field ${field}: ${error.message}`,
      );
      return null;
    }
  }

  async hdel(key: string, field: string): Promise<boolean> {
    try {
      await this.redisClient.hdel(key, field);
      return true;
    } catch (error) {
      this.logger.error(
        `Redis HDEL error for key ${key}, field ${field}: ${error.message}`,
      );
      return false;
    }
  }

  async publish(channel: string, message: string): Promise<boolean> {
    try {
      await this.redisClient.publish(channel, message);
      return true;
    } catch (error) {
      this.logger.error(
        `Redis PUBLISH error for channel ${channel}: ${error.message}`,
      );
      return false;
    }
  }

  async subscribe(
    channel: string,
    handler: (message: string) => void,
  ): Promise<void> {
    try {
      await this.redisClient.subscribe(channel);
      this.redisClient.on("message", (receivedChannel, message) => {
        if (receivedChannel === channel) {
          handler(message);
        }
      });
    } catch (error) {
      this.logger.error(
        `Redis SUBSCRIBE error for channel ${channel}: ${error.message}`,
      );
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.redisClient.disconnect();
      this.logger.log("Redis disconnected");
    } catch (error) {
      this.logger.error(`Redis disconnect error: ${error.message}`);
    }
  }
}
