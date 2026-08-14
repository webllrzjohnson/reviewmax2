import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ADMIN_POSTS_PAGE_SIZE_OPTIONS,
  parseAdminPostsPagination,
} from "../lib/admin-posts-pagination";

describe("parseAdminPostsPagination", () => {
  it("defaults to page 1 with 20 posts per page", () => {
    assert.deepEqual(parseAdminPostsPagination({}), { page: 1, pageSize: 20 });
  });

  it("accepts configured page size options", () => {
    assert.deepEqual(parseAdminPostsPagination({ page: "3", perPage: "30" }), {
      page: 3,
      pageSize: 30,
    });
    assert.deepEqual(ADMIN_POSTS_PAGE_SIZE_OPTIONS, [10, 20, 30, 50]);
  });

  it("clamps invalid page and page size values", () => {
    assert.deepEqual(parseAdminPostsPagination({ page: "0", perPage: "999" }), {
      page: 1,
      pageSize: 20,
    });
  });
});
