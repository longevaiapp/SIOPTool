"use client";

import { useT } from "@/lib/i18n";

export default function RegisterPage() {
    const t = useT();
    return (
        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
            <div className="mb-6 text-center">
                <h1 className="text-2xl font-bold text-gray-900">LongevAI</h1>
                <p className="mt-1 text-sm text-gray-500">{t("auth.create_workspace")}</p>
            </div>

            <form className="space-y-4">
                <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                        {t("auth.full_name")}
                    </label>
                    <input
                        type="text"
                        name="name"
                        autoComplete="name"
                        required
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                </div>
                <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                        {t("auth.email")}
                    </label>
                    <input
                        type="email"
                        name="email"
                        autoComplete="email"
                        required
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                </div>
                <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                        {t("auth.password")}
                    </label>
                    <input
                        type="password"
                        name="password"
                        autoComplete="new-password"
                        required
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                </div>
                <button
                    type="submit"
                    className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                    {t("auth.create_account")}
                </button>
            </form>

            <p className="mt-4 text-center text-sm text-gray-500">
                {t("auth.have_account")}{" "}
                <a href="/login" className="text-blue-600 hover:underline">
                    {t("auth.sign_in")}
                </a>
            </p>
        </div>
    );
}
