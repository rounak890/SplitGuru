from django.db import models
from django.conf import settings

# Create your models here.
class Group(models.Model):
    group_name = models.CharField(max_length=100)
    description = models.TextField()
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table = 'groups'

class GroupMember(models.Model):
    group = models.ForeignKey(Group, on_delete=models.CASCADE)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    joined_at = models.DateTimeField(auto_now_add=True)
    role = models.CharField(
        max_length=50, 
        choices=[
            ('admin', 'Admin'), 
            ('member', 'Member')
        ], 
        default='member'
        )
    class Meta:
        db_table = 'group_members'
        unique_together = ('group', 'user')


class Expense(models.Model):
    group = models.ForeignKey(Group, on_delete=models.CASCADE)
    paid_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='expenses_paid')
    description = models.CharField(max_length=200, blank=True)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    expense_date = models.DateField(auto_now_add=True)
    category = models.CharField(max_length=50, blank=True)
    receipt_image = models.FileField(upload_to='expense_receipts/', blank=True, null=True)
    class Meta:
        db_table = 'expenses'

class ExpenseSplit(models.Model):
    expense = models.ForeignKey(Expense, on_delete=models.CASCADE, related_name='splits')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    owed_amount = models.DecimalField(max_digits=10, decimal_places=2)
    class Meta:
        db_table = 'expense_splits'


class Settlement(models.Model):
    group = models.ForeignKey(Group, on_delete=models.CASCADE)
    from_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='debts')
    to_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='credits')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table = 'settlements'

class Payment(models.Model):
    settlement = models.ForeignKey(Settlement, on_delete=models.CASCADE)
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2)
    payment_date = models.DateTimeField(auto_now_add=True)
    payment_method = models.CharField(max_length=30, blank=True)
    transaction_reference = models.CharField(max_length=100, blank=True)
    receipt_image = models.FileField(upload_to='payment_receipts/', blank=True, null=True)
    class Meta:
        db_table = 'payments'

    
