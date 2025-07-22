import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const AdminUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.admin;
  },
);
