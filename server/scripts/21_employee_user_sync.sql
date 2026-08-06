-- Keep the shared display name synchronized from login identity to the linked operational resource.
-- Email, role, permissions and credentials remain exclusively on users.

CREATE OR REPLACE FUNCTION sync_linked_operational_resource_name()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.name IS DISTINCT FROM OLD.name THEN
        UPDATE operational_resources
        SET name = NEW.name, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = NEW.id AND name IS DISTINCT FROM NEW.name;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_user_name_to_operational_resource ON users;
CREATE TRIGGER sync_user_name_to_operational_resource
AFTER UPDATE OF name ON users
FOR EACH ROW EXECUTE FUNCTION sync_linked_operational_resource_name();

-- Reconcile any pre-existing links once. Future changes are maintained by the trigger.
UPDATE operational_resources r
SET name = u.name, updated_at = CURRENT_TIMESTAMP
FROM users u
WHERE r.user_id = u.id AND r.name IS DISTINCT FROM u.name;

