import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const CreateUser = mutation({
    args: {
        name: v.string(),
        email: v.string(),
        picture: v.string(),
        uid: v.string(),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db.query("users")
            .filter((q) => q.eq(q.field("uid"), args.uid))
            .first();

        if (user) {
            return user;
        }

        const id = await ctx.db.insert("users", {
            name: args.name,
            email: args.email,
            picture: args.picture,
            uid: args.uid,
            credits: 5, // 5 free credits for new users
        });

        return await ctx.db.get(id);
    },
});

export const GetUser = query({
    args: { uid: v.string() },
    handler: async (ctx, args) => {
        const user = await ctx.db.query("users")
            .filter((q) => q.eq(q.field("uid"), args.uid))
            .first();
        return user;
    },
});

export const DeductCredits = mutation({
    args: { uid: v.string() },
    handler: async (ctx, args) => {
        const user = await ctx.db.query("users")
            .filter((q) => q.eq(q.field("uid"), args.uid))
            .first();

        if (!user || (user.credits || 0) <= 0) {
            throw new Error("Insufficient credits");
        }

        await ctx.db.patch(user._id, {
            credits: user.credits - 1,
        });
        return true;
    },
});

export const AddCredits = mutation({
    args: { uid: v.string(), amount: v.number() },
    handler: async (ctx, args) => {
        const user = await ctx.db.query("users")
            .filter((q) => q.eq(q.field("uid"), args.uid))
            .first();

        if (!user) {
            throw new Error("User not found");
        }

        await ctx.db.patch(user._id, {
            credits: (user.credits || 0) + args.amount,
        });
        return true;
    },
});
