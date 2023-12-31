import { createRouter } from "router";
import { blogs } from "services";
import { Blog, toBlog } from "models";

export const getMyMainBlog = createRouter({
  description: "내 메인 블로그를 가져옵니다.",
  authorized: true,
  async handler(ctx): Promise<Blog> {
    const blog = await blogs.findMainByUserId(ctx.auth.user.id);
    return toBlog(blog);
  },
});
