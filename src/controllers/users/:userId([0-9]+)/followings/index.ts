import { createRouter } from "router";
import { users } from "services";
import { User, toUser } from "models";
import { normalizePaginationQuery } from "utils/pagination";

export const getUserFollowings = createRouter({
  description: "다른 사용자의 팔로잉 목록을 가져옵니다.",
  authorized: true,
  async handler(ctx): Promise<User[]> {
    const options = normalizePaginationQuery(ctx.query);
    const list = await users.findFollowings(
      ctx.auth.user.id,
      { userId: +ctx.param.userId },
      options,
    );
    return Promise.all(list.map(async (user) => toUser(user)));
  },
});
