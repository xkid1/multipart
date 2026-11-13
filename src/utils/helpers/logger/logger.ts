/**
 * Log level type for console logging.
 *
 * Ordered by severity (lowest to highest):
 * - `debug` — Detailed diagnostic information (weight 10).
 * - `info` — General informational messages (weight 20).
 * - `warn` — Warning messages for potentially problematic situations (weight 30).
 * - `error` — Error messages for serious problems (weight 40).
 * - `silent` — Suppress all logging output (weight 100).
 *
 * Messages at the current level and above are logged; messages below are suppressed.
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 100,
};

const COLORS: Record<Exclude<LogLevel, 'silent'>, string> = {
  debug: '\x1b[90m', // gray
  info: '\x1b[36m', // cyan
  warn: '\x1b[33m', // yellow
  error: '\x1b[31m', // red
};
const RESET = '\x1b[0m';

function isLogLevel(value: unknown): value is LogLevel {
  return typeof value === 'string' && value in LEVEL_WEIGHT;
}

/**
 * Simple leveled console logger with namespace support.
 *
 * **Features:**
 * - Always on by default (level "info"), no DEBUG env var needed.
 * - Level is read lazily from `Logger.setLevel()` or `process.env.LOG_LEVEL`,
 *   so it works even if `.env` is loaded after this module is imported.
 * - Outputs timestamps, log level, namespace, and message.
 * - Supports color output (auto-detected from TTY and NO_COLOR env).
 * - Provides hierarchical namespaces via `child()` method.
 *
 * **Levels:**
 * - `debug` — Detailed diagnostic info (only if LOG_LEVEL=debug).
 * - `info` — General informational messages (default).
 * - `warn` — Warnings for potentially problematic situations.
 * - `error` — Errors for serious problems.
 * - `silent` — Suppress all logging.
 *
 * **Environment variables:**
 * - `LOG_LEVEL` — Set log level at runtime (e.g., `LOG_LEVEL=debug`).
 * - `NO_COLOR` — Disable colored output (respected even if TTY detected).
 *
 * **Usage:**
 * ```typescript
 * const logger = new Logger('app');
 * logger.info('Server started on port', 3000);
 * logger.error('Failed to connect:', error);
 *
 * const dbLogger = logger.child('db');   // namespace "app:db"
 * dbLogger.debug('Query executed in', duration, 'ms');
 * ```
 *
 * **Output Example:**
 * ```
 * 2025-11-13T21:36:10.030Z INFO  [app] Server started on port 3000
 * 2025-11-13T21:36:11.050Z ERROR [app:db] Query timeout after 5000ms
 * ```
 */
class Logger {
  /**
   * Global log level override (takes priority over LOG_LEVEL env var).
   *
   * Set via `Logger.setLevel()`.
   *
   * @private
   */
  private static levelOverride: LogLevel | null = null;

  /**
   * Namespace for this logger instance (e.g., 'app', 'app:db').
   *
   * @private
   */
  private readonly namespace: string;

  /**
   * Create a new logger with the given namespace.
   *
   * @param namespace - The namespace for this logger (e.g., 'app', 'db', 'parser').
   *                    Used to identify log sources in output.
   *
   * @example
   * const log = new Logger('multipart');
   */
  constructor(namespace: string) {
    this.namespace = namespace;
  }

  /**
   * Set the global log level at runtime.
   *
   * This takes priority over the `LOG_LEVEL` environment variable.
   * All loggers (existing and new) will respect this setting immediately.
   *
   * @param level - The log level to set.
   *
   * @example
   * Logger.setLevel('debug');  // Show debug messages
   * Logger.setLevel('silent');  // Suppress all output
   */
  static setLevel(level: LogLevel): void {
    Logger.levelOverride = level;
  }

  /**
   * Get the current effective log level.
   *
   * Priority order:
   * 1. `Logger.setLevel()` override (if set).
   * 2. `process.env.LOG_LEVEL` environment variable (if set and valid).
   * 3. Default: `'info'`.
   *
   * @returns The current log level.
   *
   * @example
   * Logger.setLevel('debug');
   * Logger.getLevel(); // 'debug'
   */
  static getLevel(): LogLevel {
    if (Logger.levelOverride) return Logger.levelOverride;

    const fromEnv = process.env.LOG_LEVEL?.toLowerCase();
    return isLogLevel(fromEnv) ? fromEnv : 'info';
  }

  /**
   * Create a child logger with a sub-namespace.
   *
   * The child inherits the parent namespace and appends a colon and the sub-namespace.
   * Useful for categorizing logs from different subsystems.
   *
   * @param subNamespace - The sub-namespace to append.
   * @returns A new Logger instance with the combined namespace.
   *
   * @example
   * const log = new Logger('app');
   * const dbLog = log.child('db');     // namespace: 'app:db'
   * const queryLog = dbLog.child('query'); // namespace: 'app:db:query'
   */
  child(subNamespace: string): Logger {
    return new Logger(`${this.namespace}:${subNamespace}`);
  }

  /**
   * Log a debug-level message.
   *
   * Debug messages are only shown if LOG_LEVEL is set to 'debug'.
   *
   * @param message - The primary message to log.
   * @param args - Additional arguments to log (printed after the message).
   *
   * @example
   * logger.debug('Parsing buffer of size', buffer.length);
   */
  debug(message: unknown, ...args: unknown[]): void {
    this.write('debug', message, args);
  }

  /**
   * Log an info-level message (alias of `info()`).
   *
   * Kept for backward compatibility. Prefer `info()` for new code.
   *
   * @param message - The primary message to log.
   * @param args - Additional arguments to log.
   *
   * @deprecated Use `info()` instead.
   */
  log(message: unknown, ...args: unknown[]): void {
    this.write('info', message, args);
  }

  /**
   * Log an info-level message (default level).
   *
   * Info messages are shown by default (unless LOG_LEVEL is set higher).
   *
   * @param message - The primary message to log.
   * @param args - Additional arguments to log.
   *
   * @example
   * logger.info('Parsing multipart form with', fieldCount, 'fields');
   */
  info(message: unknown, ...args: unknown[]): void {
    this.write('info', message, args);
  }

  /**
   * Log a warning-level message.
   *
   * Warnings indicate potentially problematic situations that should be reviewed.
   *
   * @param message - The primary message to log.
   * @param args - Additional arguments to log.
   *
   * @example
   * logger.warn('Boundary exceeds recommended size:', boundaryLength, 'bytes');
   */
  warn(message: unknown, ...args: unknown[]): void {
    this.write('warn', message, args);
  }

  /**
   * Log an error-level message.
   *
   * Errors indicate serious problems that prevent normal operation.
   * The logger automatically formats Error objects with their stack traces.
   *
   * @param message - The primary message to log.
   * @param args - Additional arguments to log (often Error objects).
   *
   * @example
   * logger.error('Failed to parse multipart:', error);
   */
  error(message: unknown, ...args: unknown[]): void {
    this.write('error', message, args);
  }

  /**
   * Write a log message to the appropriate console method.
   *
   * Respects the current log level: messages below the current level are suppressed.
   * Formats output with timestamp, level tag, namespace, and message.
   * Applies color to output when running in a TTY and NO_COLOR is not set.
   *
   * @param level - The log level (debug, info, warn, error).
   * @param message - The primary message to log.
   * @param args - Additional arguments to log.
   *
   * @private
   */
  private write(
    level: Exclude<LogLevel, 'silent'>,
    message: unknown,
    args: unknown[],
  ): void {
    if (LEVEL_WEIGHT[level] < LEVEL_WEIGHT[Logger.getLevel()]) return;

    const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
    const time = new Date().toISOString();
    const tag = level.toUpperCase().padEnd(5);
    const prefix = useColor
      ? `${COLORS[level]}${time} ${tag}${RESET} [${this.namespace}]`
      : `${time} ${tag} [${this.namespace}]`;

    // console.* prints Error objects with their stack trace automatically.
    switch (level) {
      case 'error':
        console.error(prefix, message, ...args);
        break;
      case 'warn':
        console.warn(prefix, message, ...args);
        break;
      case 'debug':
        console.debug(prefix, message, ...args);
        break;
      case 'info':
        console.log(prefix, message, ...args);
        break;
    }
  }
}

export default Logger;
