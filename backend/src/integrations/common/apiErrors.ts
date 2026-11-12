export class ExternalApiError extends Error {
  public readonly statusCode: number;
  public readonly isExternalServiceError: boolean = true;
  public readonly serviceName: string;

  constructor(serviceName: string, message: string, statusCode = 502) {
    super(message);
    this.name = 'ExternalApiError';
    this.serviceName = serviceName;
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, ExternalApiError.prototype);
  }
}
