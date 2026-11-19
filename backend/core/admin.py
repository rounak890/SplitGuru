# Register your models here.
from django.contrib import admin
from .models import Group, GroupMember, Expense, ExpenseSplit, Settlement, Payment

admin.site.register([Group, GroupMember, Expense, ExpenseSplit, Settlement, Payment])