# Lab Tests — Confirmed Behaviors

## Service: list

1. Returns only active lab tests ordered by name ascending
2. Returns all lab tests (active and inactive) when includeInactive is true
3. Returns an empty array when no lab tests exist

## Service: getById

4. Returns the lab test when given a valid ID
5. Returns inactive lab tests (needed for order history)
6. Throws when given an ID that does not exist

## Service: create

7. Creates a lab test with valid data and returns the saved record
8. Sets createdById to the calling user's ID
9. Throws when code already exists (unique constraint)

## Service: update

10. Updates name, priceCents, and turnaroundHours and returns the updated record
11. Does not change the code field
12. Sets updatedById to the calling user's ID
13. Throws when lab test ID does not exist
14. Allows updating a retired (inactive) lab test

## Service: retire

15. Sets active to false on an active lab test
16. Sets updatedById to the calling user's ID
17. Is idempotent — retiring an already-retired test does not throw

## Service: reactivate

18. Sets active to true on a retired lab test
19. Sets updatedById to the calling user's ID
20. Is idempotent — reactivating an already-active test does not throw
