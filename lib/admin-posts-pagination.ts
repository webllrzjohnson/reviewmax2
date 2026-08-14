export const ADMIN_POSTS_PAGE_SIZE_OPTIONS = [10, 20, 30, 50] as const;
export const DEFAULT_ADMIN_POSTS_PAGE_SIZE = 20;

type AdminPostsPaginationInput = {
  page?: string | string[];
  perPage?: string | string[];
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function parseAdminPostsPagination(input: AdminPostsPaginationInput) {
  const page = Number.parseInt(firstParam(input.page) ?? "1", 10);
  const pageSize = Number.parseInt(
    firstParam(input.perPage) ?? String(DEFAULT_ADMIN_POSTS_PAGE_SIZE),
    10,
  );

  return {
    page: Number.isFinite(page) && page > 0 ? page : 1,
    pageSize: ADMIN_POSTS_PAGE_SIZE_OPTIONS.includes(
      pageSize as (typeof ADMIN_POSTS_PAGE_SIZE_OPTIONS)[number],
    )
      ? pageSize
      : DEFAULT_ADMIN_POSTS_PAGE_SIZE,
  };
}

export function getAdminPostsPageCount(total: number, pageSize: number) {
  return Math.max(1, Math.ceil(total / pageSize));
}
