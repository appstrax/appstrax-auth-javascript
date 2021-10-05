import { Services } from './services';
import { Utils } from './utils';
import { StorageService } from './storage.service';
import { HttpService } from './http.service';

import {
  TokensDto, ForgotPasswordDto, LoginDto, RegisterDto,
  ResetPasswordDto, MessageDto, ChangePasswordDto
} from '../dtos/auth-dtos';
import { User } from '../models/user';

export class AuthService {
  private user: User = null;
  private tokens: TokensDto = null;
  private loading = false;

  constructor(
    private utils: Utils,
    private storageService: StorageService,
    private http: HttpService
  ) { }

  public async init(baseUrl: string): Promise<void> {
    Services.instance().setBaseUrl(baseUrl);

    const tokens = this.storageService.getTokens();
    await this.onAuthStateChanged(tokens);
  }


  private async onAuthStateChanged(tokens: TokensDto) {
    this.loading = true;

    // if the auth token has expired, try refresh the token
    if (tokens && this.utils.isTokenExpired(tokens.token)) {
      try {
        tokens = await this.refreshTokens(tokens.refreshToken);
      } catch (err) {
        tokens = null;
      }
    }

    this.tokens = tokens;
    this.user = tokens ? this.utils.decodeToken(tokens.token) : null;
    this.storageService.setTokens(tokens);

    this.loading = false;
  }

  private refreshTokens(refreshToken: string): Promise<TokensDto> {
    const url = this.getAuthUrl('refresh-token');
    return this.http.post(url, { refreshToken });
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
      const tokens: TokensDto = await this.http.post(url, registerDto);
      await this.onAuthStateChanged(tokens);
      return this.user;
    } catch (err) {
      await this.logout();
      throw err;
    }
  }

  public async login(loginDto: LoginDto): Promise<User> {
    try {
      const url = this.getAuthUrl('login');
      const tokens: TokensDto = await this.http.post(url, loginDto);
      await this.onAuthStateChanged(tokens);
      return this.user;
    } catch (err) {
      await this.logout();
      throw err;
    }
  }

  public async getRefreshedToken(): Promise<string> {
    if (this.loading) {
      while (this.loading) { await this.sleep(50); }
      if (this.tokens) { return this.tokens.token; }
      else { throw new Error('Something went wrong'); }
    } else {
      this.loading = true;
      try {
        const tokens: TokensDto = await this.refreshTokens(this.tokens.refreshToken);
        await this.onAuthStateChanged(tokens);
        this.loading = false;
        return this.tokens.token;
      } catch (err) {
        await this.logout();
        this.loading = false;
        throw err;
      }
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
    return await this.http.post(url, changePassword);
  }

  public async saveUserData(data: any): Promise<User> {
    const url = this.getUserUrl('data');
    const tokens: TokensDto = await this.http.post(url, data);
    await this.onAuthStateChanged(tokens);
    return this.user;
  }

  public async isAuthenticated(): Promise<boolean> {
    while (this.loading) { await this.sleep(50); }
    return this.user != null;
  }

  private sleep(milliseconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
  }

  public getAuthToken(): string {
    return this.tokens ? this.tokens.token : null;
  }

  public getUser(): User {
    return this.user;
  }

  public async logout(): Promise<void> {
    await this.http.post(this.getUserUrl('logout'), {});
    this.onAuthStateChanged(null);
  }
}
