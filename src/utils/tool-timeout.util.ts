import winston from "winston";

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: "recallsync-mcp" },
  transports: [
    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.File({ filename: "combined.log" }),
  ],
});

if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    })
  );
}

export const executeToolWithTimeout = async <T>(
  toolFunction: () => Promise<T>,
  toolName: string,
  options: { retries?: number } = {}
): Promise<T> => {
  const timeoutMs = 60000;
  const { retries: maxRetries = 0 } = options;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      if (attempt > 1) {
        logger.info(`Retrying tool: ${toolName} (attempt ${attempt})`);
      } else {
        logger.info(`Executing tool: ${toolName} (attempt ${attempt})`);
      }

      const result = await Promise.race([
        toolFunction(),
        new Promise<never>((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error(`Tool '${toolName}' timed out after ${timeoutMs}ms`)
              ),
            timeoutMs
          )
        ),
      ]);

      logger.info(`Tool '${toolName}' executed successfully.`);
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      logger.warn(`Tool '${toolName}' failed on attempt ${attempt}.`, {
        error: lastError.message,
      });

      if (attempt > maxRetries) {
        logger.error(
          `Tool '${toolName}' failed after all ${attempt} attempts.`,
          { error: lastError.message }
        );
        throw lastError;
      }
    }
  }
  throw lastError!;
};
