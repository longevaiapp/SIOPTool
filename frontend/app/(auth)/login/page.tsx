"use client";

import { useRouter } from "next/navigation";
import { DEMO_USERS, ROLE_CONFIG, type UserRole } from "@/lib/types/user";
import { useT } from "@/lib/i18n";

export default function LoginPage() {
    const t = useT();
    const router = useRouter();

    const handleQuickLogin = (role: UserRole) => {
        const user = DEMO_USERS.find(u => u.role === role);
        if (user) {
            // Store user in localStorage for demo purposes
            localStorage.setItem('demo_user', JSON.stringify(user));
            // Redirect based on role
            if (role === 'client') {
                router.push('/workspace');
            } else {
                router.push('/overview');
            }
        }
    };

    return (
        <div className="glass-card w-full max-w-md p-8">
            {/* Logo */}
            <div className="mb-8 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#30b0c7] to-[#007aff] shadow-lg shadow-[#007aff]/30">
                    <span className="text-2xl font-bold text-white">L</span>
                </div>
                <h1 className="text-2xl font-bold text-[#1d1d1f]" translate="no">
                    Longe<span className="text-[#007aff]">vAI</span>
                </h1>
                <p className="mt-1 text-sm text-[#8e8e93]">{t("auth.tagline")}</p>
            </div>

            {/* Login Form */}
            <form className="space-y-4">
                <div>
                    <label className="mb-1.5 block text-[13px] font-medium text-[#1d1d1f]">
                        {t("auth.email")}
                    </label>
                    <input
                        type="email"
                        name="email"
                        autoComplete="email"
                        placeholder="you@company.com"
                        className="w-full rounded-xl border border-black/[0.08] bg-black/[0.02] px-4 py-3 text-[14px] text-[#1d1d1f] placeholder-[#8e8e93] transition-all focus:border-[#007aff] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#007aff]/20"
                    />
                </div>
                <div>
                    <label className="mb-1.5 block text-[13px] font-medium text-[#1d1d1f]">
                        {t("auth.password")}
                    </label>
                    <input
                        type="password"
                        name="password"
                        autoComplete="current-password"
                        placeholder="••••••••"
                        className="w-full rounded-xl border border-black/[0.08] bg-black/[0.02] px-4 py-3 text-[14px] text-[#1d1d1f] placeholder-[#8e8e93] transition-all focus:border-[#007aff] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#007aff]/20"
                    />
                </div>
                <button
                    type="submit"
                    className="w-full rounded-xl bg-gradient-to-r from-[#007aff] to-[#5856d6] px-4 py-3 text-[14px] font-semibold text-white shadow-lg shadow-[#007aff]/25 transition-all hover:shadow-xl hover:shadow-[#007aff]/30"
                >
                    {t("auth.sign_in")}
                </button>
            </form>

            <p className="mt-4 text-center text-[13px] text-[#8e8e93]">
                {t("auth.no_account")}{" "}
                <a href="/register" className="font-medium text-[#007aff] hover:underline">
                    {t("auth.register")}
                </a>
            </p>

            {/* Divider */}
            <div className="my-6 flex items-center gap-4">
                <div className="h-px flex-1 bg-black/[0.08]" />
                <span className="text-[11px] font-medium uppercase tracking-wider text-[#8e8e93]">
                    {t("auth.quick_demo")}
                </span>
                <div className="h-px flex-1 bg-black/[0.08]" />
            </div>

            {/* Quick Login Buttons */}
            <div className="grid grid-cols-2 gap-2">
                {(Object.keys(ROLE_CONFIG) as UserRole[]).map((role) => {
                    const config = ROLE_CONFIG[role];
                    return (
                        <button
                            key={role}
                            onClick={() => handleQuickLogin(role)}
                            className="group flex flex-col items-start rounded-xl border border-black/[0.06] bg-black/[0.02] p-3 text-left transition-all hover:border-black/[0.12] hover:bg-black/[0.04]"
                            style={{
                                borderLeftWidth: '3px',
                                borderLeftColor: config.color,
                            }}
                        >
                            <span className="text-[12px] font-semibold text-[#1d1d1f]">
                                {t(config.labelKey)}
                            </span>
                            <span className="text-[10px] text-[#8e8e93]">
                                {t(config.descriptionKey)}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Dev note */}
            <p className="mt-4 text-center text-[10px] text-[#c7c7cc]">
                {t("auth.dev_note")}
            </p>
        </div>
    );
}
