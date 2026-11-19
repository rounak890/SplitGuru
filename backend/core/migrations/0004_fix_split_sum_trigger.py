from django.db import migrations


TRIGGER_SQL = """
CREATE OR REPLACE FUNCTION check_split_sum() RETURNS TRIGGER AS $$
DECLARE
    split_total NUMERIC;
    expense_total NUMERIC;
BEGIN
    SELECT COALESCE(SUM(owed_amount), 0) INTO split_total
    FROM expense_splits WHERE expense_id = NEW.expense_id;

    SELECT total_amount INTO expense_total
    FROM expenses WHERE id = NEW.expense_id;

    IF split_total > expense_total THEN
        RAISE EXCEPTION 'Split sum exceeds total expense amount';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
"""


class Migration(migrations.Migration):
    dependencies = [('core', '0003_create_expense_summary_view')]
    operations = [migrations.RunSQL(TRIGGER_SQL, migrations.RunSQL.noop)]
