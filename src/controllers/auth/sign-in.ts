import { createRouter } from "router";
import { HttpError } from "@/utils/http";
import { nullable } from "@/utils/validator";

import * as users from "services/users";
import * as jwt from "services/jwt";

export default createRouter({
  method: "POST",
  descriptor: {
    username: nullable("string"),
    avatarUrl: nullable("string"),
    provider: nullable("string"),
    providerId: nullable("string"),
  },
  async handler(ctx) {
    const input = ctx.body;
    if (!input.provider || !input.providerId) {
      throw new HttpError("공급자 정보를 제공해야 합니다.", "BAD_REQUEST");
    }

    const foundUser = await users
      .findByProvider(input.provider, input.providerId)
      .then((node) => node ?? users.create(input))
      .then((node) => users.sync(node.id));

    return {
      accessToken: jwt.sign({ id: foundUser.id }),
    };
  },
});
