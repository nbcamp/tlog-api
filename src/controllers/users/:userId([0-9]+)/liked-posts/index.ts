import { createRouter } from "router";
import { likes } from "services";
import { Post, toCommunityPost } from "models";
import { normalizePaginationQuery } from "utils/pagination";

export const getUserLikedPosts = createRouter({
  description: "사용자가 좋아요한 게시글을 조회합니다.",
  method: "GET",
  authorized: true,
  async handler(ctx): Promise<Post[]> {
    const options = normalizePaginationQuery(ctx.query);
    const list = await likes.findAllPosts(ctx.auth.user.id, options, {
      userId: +ctx.param.userId,
    });
    return Promise.all(list.map(({ post }) => toCommunityPost(post)));
  },
});
