import glob from "fast-glob";
import path from "node:path";

import { InferType, TypeDescriptor, typeGuard } from "@/guards/typeGuard";
import { HttpError } from "@/utilities/error";
import { User } from "@prisma/client";
import * as jwt from "services/jwt";
import * as users from "services/users";

export type Body = { [key: string]: any };

export type Context<TBody extends Body = Body> = {
  param: { [key: string]: string };
  query: { [key: string]: string };
  body: TBody;
  request: Request;
};

export type AuthContext<TBody extends Body> = Context<TBody> & {
  auth: {
    token: string;
    user: User;
  };
};

export type Result = Record<string, any>;

export type Handler<TContext extends Context = Context> = (
  context: TContext,
) => Result | Promise<Result>;

export type Router<
  Descriptor extends TypeDescriptor,
  TBody extends Body = InferType<Descriptor>,
> = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  descriptor?: Descriptor;
  authorized?: boolean;
} & (
  | {
      authorized: true;
      handler: Handler<AuthContext<TBody>>;
    }
  | {
      authorized?: false;
      handler: Handler<Context<TBody>>;
    }
);

export type AnyRouter = Router<any> & {
  handler: Handler<Context>;
};

export function createRouter<Descriptor extends TypeDescriptor = never>(
  router: Router<Descriptor>,
): Router<Descriptor> {
  return {
    ...router,
    method: router.method ?? "GET",
    async handler(context) {
      if (router.descriptor && !typeGuard(context.body, router.descriptor)) {
        throw new HttpError("요청 정보가 올바르지 않습니다.", "BAD_REQUEST");
      }

      if (router.authorized) {
        const authorization = context.request.headers.get("Authorization");
        const [tokenType, token] = authorization?.split(" ") ?? [];
        if (tokenType !== "Bearer" || !token) {
          throw new HttpError("로그인이 필요합니다.", "UNAUTHORIZED");
        }
        const payload = jwt.verify(token);
        if (!payload || !("id" in payload) || typeof payload.id !== "number") {
          throw new HttpError("인증 정보가 올바르지 않습니다.", "UNAUTHORIZED");
        }
        const user = await users.findById(payload.id);
        if (!user) {
          throw new HttpError(
            "사용자 정보를 찾을 수 없습니다.",
            "UNAUTHORIZED",
          );
        }

        Reflect.set(context, "auth", {
          token,
          user,
        });
      }
      return router.handler(context as any);
    },
  };
}

async function makeFileSystemBasedRouterMap(dir: string) {
  const controllers = path.resolve(__dirname, dir);
  const filenames = await glob("**/*.ts", { cwd: controllers });

  const routers: {
    route: string;
    router: AnyRouter;
  }[] = await Promise.all(
    filenames.map(async (filename) => {
      const route = `/${filename.replace(/\.ts$/, "")}`;
      const { default: router } = await import(
        path.resolve(controllers, filename)
      );
      if (!router) {
        throw new Error(`Router must be exported as default from ${filename}`);
      }
      return { route, router };
    }),
  );

  return routers.reduce<{ [route: string]: AnyRouter }>(
    (acc, { route, router }) => ({ ...acc, [route]: router }),
    {},
  );
}

export default await makeFileSystemBasedRouterMap("controllers");
