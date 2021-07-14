import { AuthTokensDto } from '../dtos/auth-dtos';

export class StorageService {

  private authTokenKey = 'APPSTRAX_AUTH_TOKEN';
  private refreshTokenKey = 'APPSTRAX_REFRESH_TOKEN';

  private getItem(key: string): string {
    try {
      return localStorage.getItem(key) || '';
    } catch (e) {
      return '';
    }
  }

  private setItem(key: string, value: string) {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      // TODO handle err
    }
  }

  private clearTokens() {
    try {
      localStorage.removeItem(this.authTokenKey);
      localStorage.removeItem(this.refreshTokenKey);
    } catch (e) {
      // TODO handle err
    }
  }

  public getAuthTokens(): AuthTokensDto {
    const token = this.getItem(this.refreshTokenKey);
    const refreshToken = this.getItem(this.refreshTokenKey);
    if (!token || !refreshToken) { return null; }
    return { token, refreshToken };
  }

  public setAuthTokens(auth: AuthTokensDto) {
    if (!auth || !auth.token || !auth.refreshToken) {
      this.clear();
    } else {
      this.setItem(this.authTokenKey, auth.token);
      this.setItem(this.refreshTokenKey, auth.refreshToken);
    }
  }

  public clear() {
    this.clearTokens();
  }
}
