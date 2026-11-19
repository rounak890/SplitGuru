from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('core', '0005_add_group_creators_as_members')]

    operations = [
        migrations.AddField(
            model_name='expense',
            name='receipt_image',
            field=models.FileField(blank=True, null=True, upload_to='expense_receipts/'),
        ),
        migrations.AddField(
            model_name='payment',
            name='receipt_image',
            field=models.FileField(blank=True, null=True, upload_to='payment_receipts/'),
        ),
    ]
