import useSWR from "swr";

const fetcher = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
};

export function useApi<T>(url: string | null) {
    return useSWR<T>(url, fetcher);
}
