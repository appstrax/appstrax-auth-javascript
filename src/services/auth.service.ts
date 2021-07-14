import { Services } from './services';
import { Utils } from './utils';
import { StorageService } from './storage.service';
import { HttpService } from './http.service';

import {
  AuthTokensDto, ForgotPasswordDto, LoginDto, RegisterDto,
  ResetPasswordDto, MessageDto, ChangePasswordDto
} from '../dtos/auth-dtos';
import { User } from '../models/user';

export class AuthService {

  private user: User = null;
  private tokens: AuthTokensDto = null;

  constructor(
    private utils: Utils,
    private storageService: StorageService,
    private http: HttpService
  ) {
    const tokens = this.storageService.getAuthTokens();
    this.onAuthStateChanged(tokens);
  }

  private async onAuthStateChanged(tokens: AuthTokensDto) {
    // if the auth token has expired, try refresh the token
    if (tokens && this.utils.isTokenExpired(tokens.token)) {
      try {
        tokens = await this.refreshTokens();
      } catch (err) {
        tokens = null;
      }
    }

    this.tokens = tokens;
    this.user = tokens ? this.utils.decodeToken(tokens.token) : null;
    this.storageService.setAuthTokens(tokens);
  }

  public async refreshTokens(): Promise<AuthTokensDto> {
    const url = this.getAuthUrl('refresh-token');
    return await this.http.post(url, this.tokens);
  }

  private getAuthUrl(extension: string): string {
    const base = Services.instance().getBaseUrl();
    return this.utils.pathJoin(base, 'api/auth', extension);
  }

  private getUserUrl(extension: string): string {
    const base = Services.instance().getBaseUrl();
    return this.utils.pathJoin(base, 'api/user', extension);
  }

  public async register(registerDto: RegisterDto): Promise<User> {
    try {
      const url = this.getAuthUrl('register');
      const tokens: AuthTokensDto = await this.http.post(url, registerDto);
      await this.onAuthStateChanged(tokens);
      return this.user;
    } catch (err) {
      this.logout();
      throw err;
    }
  }

  public async login(loginDto: LoginDto): Promise<User> {
    try {
      const url = this.getAuthUrl('login');
      const tokens: AuthTokensDto = await this.http.post(url, loginDto);
      await this.onAuthStateChanged(tokens);
      return this.user;
    } catch (err) {
      this.logout();
      throw err;
    }
  }

  public async getRefreshedToken(): Promise<string> {
    try {
      const tokens: AuthTokensDto = await this.refreshTokens();
      await this.onAuthStateChanged(tokens);
      return this.tokens.token;
    } catch (err) {
      this.logout();
      throw err;
    }
  }

  public forgotPassword(forgotDto: ForgotPasswordDto): Promise<MessageDto> {
    return this.http.post(this.getAuthUrl('forgot-password'), forgotDto);
  }

  public resetPassword(resetDto: ResetPasswordDto): Promise<MessageDto> {
    return this.http.post(this.getAuthUrl('reset-password'), resetDto);
  }

  public async changePassword(changePassword: ChangePasswordDto): Promise<MessageDto> {
    const url = this.getUserUrl('change-password');
    return await this.http.post(url, changePassword, this.getAuthToken());
  }

  public async saveUserData(data: any): Promise<User> {
    const url = this.getUserUrl('data');
    const tokens: AuthTokensDto = await this.http.post(url, data, this.getAuthToken());
    await this.onAuthStateChanged(tokens);
    return this.user;
  }

  public isAuthenticated(): boolean {
    return this.user != null;
  }

  public getAuthToken(): string {
    return this.tokens.token;
  }

  public getUser(): User {
    return this.user;
  }

  public logout() {
    this.onAuthStateChanged(null);
  }

  public init(baseUrl: string) {
    Services.instance().setBaseUrl(baseUrl);
  };
}