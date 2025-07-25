// filepath: src/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  generateToken(payload: { address: string; role: string }): string {
    return this.jwtService.sign(payload);
  }

  generateAdminToken(payload: {
    sub: number;
    username: string;
    role: string;
  }): string {
    return this.jwtService.sign(payload);
  }

  verifyToken(token: string): any {
    try {
      return this.jwtService.verify(token);
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  verifyAdminToken(token: string): any {
    try {
      const payload = this.jwtService.verify(token);

      if (payload.role !== 'admin') {
        throw new UnauthorizedException('Invalid role');
      }

      return payload;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
