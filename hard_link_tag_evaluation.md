# Evaluation: `isHardLinked` Tag for Share Deletion

This document outlines the trade-offs between two approaches for handling the deletion of a share from the Redis database, specifically concerning files that are hard-linked across multiple shares.

## The Core Problem

When a user initiates a "delete share" operation (e.g., delete the "movies" share), the system must process all files associated with that share. The challenge lies in the fact that the vast majority of files will only exist in that one share, while a small minority will be hard-linked and also exist in other shares.

-   **Single-share files:** The entire file object should be deleted from Redis.
-   **Hard-linked files:** The file object must be *updated*. The path and share corresponding to the deleted share must be removed from their respective arrays, but the object itself must persist.

The goal is to perform this distinction and the subsequent operations (delete vs. update) as efficiently as possible.

## Option A: Application-Level Logic

This approach involves querying for all files in a share and then letting the application logic decide how to handle each one.

**Workflow:**

1.  **Query:** The application issues a single query to Redis: `find all file objects where the 'shares' array contains 'movies'`.
2.  **Iterate & Evaluate:** The application receives a list of all matching file objects. It iterates through this list. For each object, it checks the length of the `path` (or `shares`) array.
    *   If `path.length === 1`, the object is added to a "to-delete" list.
    *   If `path.length > 1`, the object is modified in memory (the "movies" path and share are removed) and added to a "to-update" list.
3.  **Execute:** The application performs two bulk operations: one to delete all the single-share objects and another to save all the updated hard-linked objects.

### Pros:
-   **Simpler Data Model:** Does not require an extra `isHardLinked` field in the schema. The data model remains slightly cleaner.
-   **Lower Write Complexity:** No need to manage the state of the `isHardLinked` flag when files are created or updated.

### Cons:
-   **Potentially Large Data Transfer:** The initial query might return a very large number of objects to the application, consuming memory and network bandwidth.
-   **Application-Side Processing:** The burden of iterating and checking the array length for every single file in the share falls on the Node.js application.

## Option B: Using a `isHardLinked` Tag

This approach leverages a searchable boolean tag (`isHardLinked`) to perform more of the filtering work on the database side.

**Workflow:**

1.  **Query & Delete:** The application issues a highly-efficient "fire-and-forget" delete query to Redis: `delete all file objects where 'shares' contains 'movies' AND 'isHardLinked' is false`. Redis handles this deletion internally, which is extremely fast.
2.  **Query & Update:** The application issues a second query: `find all file objects where 'shares' contains 'movies' AND 'isHardLinked' is true`.
    *   This query returns only the small subset of files that are actually hard-linked.
3.  **Iterate & Update:** The application iterates through this much smaller list, modifies each object in memory, and saves them back to Redis.

### Pros:
-   **Highly Efficient Deletion:** The bulk deletion of the vast majority of files is offloaded to Redis, which is optimized for such set-based operations.
-   **Reduced Data Transfer:** Only the files that *must* be updated are transferred from Redis to the application, significantly reducing memory and network load.
-   **Less Application-Side Processing:** The application only needs to loop over the small number of hard-linked files.

### Cons:
-   **More Complex Data Model:** Requires adding and indexing the `isHardLinked` field.
-   **Higher Write Complexity:** The application must correctly set `isHardLinked` to `false` on file creation and update it to `true` when a second path is added.

## Conclusion

Option B appears to be the more scalable and performant solution for the "delete share" workflow, despite the slightly higher complexity in the data model. The ability to offload the bulk deletion to Redis is a significant advantage.
