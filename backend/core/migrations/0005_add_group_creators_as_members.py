from django.db import migrations


def add_creators_to_groups(apps, schema_editor):
    Group = apps.get_model('core', 'Group')
    GroupMember = apps.get_model('core', 'GroupMember')
    db = schema_editor.connection.alias
    for group in Group.objects.using(db).exclude(created_by_id=None).iterator():
        GroupMember.objects.using(db).get_or_create(
            group_id=group.id,
            user_id=group.created_by_id,
            defaults={'role': 'admin'},
        )


class Migration(migrations.Migration):
    dependencies = [('core', '0004_fix_split_sum_trigger')]
    operations = [migrations.RunPython(add_creators_to_groups, migrations.RunPython.noop)]
