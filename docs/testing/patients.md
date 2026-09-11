# Patients — Confirmed Behaviors

## Service: list

1. Returns all patients ordered by last name ascending
2. Returns an empty array when no patients exist

## Service: getById

3. Returns the patient when given a valid ID
4. Throws when given an ID that does not exist

## Service: create

5. Creates a patient with valid data and returns the saved record
6. Throws when date of birth is in the future

## Service: update

7. Updates patient fields and returns the updated record
8. Sets updatedById to the calling user's ID
9. Throws when date of birth is in the future
10. Throws when patient ID does not exist
