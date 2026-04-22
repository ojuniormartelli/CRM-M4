
type LogLevel = 'info' | 'warn' | 'error' | 'debug';

class Logger {
  private isProd = process.env.NODE_ENV === 'production';

  private formatMessage(level: LogLevel, message: string, data?: any) {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level.toUpperCase()}] ${message} ${data ? JSON.stringify(data) : ''}`;
  }

  info(message: string, data?: any) {
    console.log(this.formatMessage('info', message, data));
  }

  warn(message: string, data?: any) {
    console.warn(this.formatMessage('warn', message, data));
  }

  error(message: string, data?: any) {
    console.error(this.formatMessage('error', message, data));
    // In production, you could send this to Sentry/LogRocket
  }

  debug(message: string, data?: any) {
    if (!this.isProd) {
      console.debug(this.formatMessage('debug', message, data));
    }
  }
}

export const logger = new Logger();
