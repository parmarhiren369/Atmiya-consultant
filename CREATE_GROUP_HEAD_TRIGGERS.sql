-- Create trigger to automatically update group head statistics
-- when policies are added, updated, or deleted

-- Function to update group head stats
CREATE OR REPLACE FUNCTION update_group_head_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Handle INSERT
    IF (TG_OP = 'INSERT' AND NEW.member_of IS NOT NULL) THEN
        UPDATE group_heads
        SET 
            total_policies = (
                SELECT COUNT(*) 
                FROM policies 
                WHERE member_of = NEW.member_of
            ),
            total_premium_amount = (
                SELECT COALESCE(SUM(
                    COALESCE(NULLIF(total_premium, '')::numeric, 
                    COALESCE(NULLIF(net_premium, '')::numeric,
                    COALESCE(premium_amount, 0)))
                ), 0)
                FROM policies 
                WHERE member_of = NEW.member_of
            ),
            updated_at = TIMEZONE('utc', NOW())
        WHERE id = NEW.member_of;
        
    -- Handle UPDATE
    ELSIF (TG_OP = 'UPDATE') THEN
        -- Update old group head if member_of changed
        IF (OLD.member_of IS NOT NULL AND OLD.member_of != NEW.member_of) THEN
            UPDATE group_heads
            SET 
                total_policies = (
                    SELECT COUNT(*) 
                    FROM policies 
                    WHERE member_of = OLD.member_of
                ),
                total_premium_amount = (
                    SELECT COALESCE(SUM(
                        COALESCE(NULLIF(total_premium, '')::numeric, 
                        COALESCE(NULLIF(net_premium, '')::numeric,
                        COALESCE(premium_amount, 0)))
                    ), 0)
                    FROM policies 
                    WHERE member_of = OLD.member_of
                ),
                updated_at = TIMEZONE('utc', NOW())
            WHERE id = OLD.member_of;
        END IF;
        
        -- Update new group head
        IF (NEW.member_of IS NOT NULL) THEN
            UPDATE group_heads
            SET 
                total_policies = (
                    SELECT COUNT(*) 
                    FROM policies 
                    WHERE member_of = NEW.member_of
                ),
                total_premium_amount = (
                    SELECT COALESCE(SUM(
                        COALESCE(NULLIF(total_premium, '')::numeric, 
                        COALESCE(NULLIF(net_premium, '')::numeric,
                        COALESCE(premium_amount, 0)))
                    ), 0)
                    FROM policies 
                    WHERE member_of = NEW.member_of
                ),
                updated_at = TIMEZONE('utc', NOW())
            WHERE id = NEW.member_of;
        END IF;
        
    -- Handle DELETE
    ELSIF (TG_OP = 'DELETE' AND OLD.member_of IS NOT NULL) THEN
        UPDATE group_heads
        SET 
            total_policies = (
                SELECT COUNT(*) 
                FROM policies 
                WHERE member_of = OLD.member_of
            ),
            total_premium_amount = (
                SELECT COALESCE(SUM(
                    COALESCE(NULLIF(total_premium, '')::numeric, 
                    COALESCE(NULLIF(net_premium, '')::numeric,
                    COALESCE(premium_amount, 0)))
                ), 0)
                FROM policies 
                WHERE member_of = OLD.member_of
            ),
            updated_at = TIMEZONE('utc', NOW())
        WHERE id = OLD.member_of;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for INSERT, UPDATE, and DELETE
DROP TRIGGER IF EXISTS trigger_update_group_head_stats_insert ON policies;
CREATE TRIGGER trigger_update_group_head_stats_insert
    AFTER INSERT ON policies
    FOR EACH ROW
    EXECUTE FUNCTION update_group_head_stats();

DROP TRIGGER IF EXISTS trigger_update_group_head_stats_update ON policies;
CREATE TRIGGER trigger_update_group_head_stats_update
    AFTER UPDATE ON policies
    FOR EACH ROW
    EXECUTE FUNCTION update_group_head_stats();

DROP TRIGGER IF EXISTS trigger_update_group_head_stats_delete ON policies;
CREATE TRIGGER trigger_update_group_head_stats_delete
    AFTER DELETE ON policies
    FOR EACH ROW
    EXECUTE FUNCTION update_group_head_stats();

-- Display success message
DO $$
BEGIN
    RAISE NOTICE '✅ Group head statistics triggers created successfully!';
    RAISE NOTICE 'Group head stats will now update automatically when policies change.';
END $$;
