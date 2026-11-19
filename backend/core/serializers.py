# core/serializers.py
from rest_framework import serializers
from django.contrib.auth.models import User
import json
from .models import Group, Expense, ExpenseSplit
from .models import GroupMember, Settlement, Payment

class GroupSerializer(serializers.ModelSerializer):
    # The creator comes from the authenticated request, not client input.
    created_by = serializers.PrimaryKeyRelatedField(read_only=True)
    # Group creation only requires a name; descriptions are optional.
    description = serializers.CharField(required=False, allow_blank=True, default='')

    class Meta:
        model = Group
        fields = ['id', 'group_name', 'description', 'created_by', 'created_at']


class ScreenshotField(serializers.FileField):
    allowed_extensions = {'.jpg', '.jpeg', '.png', '.webp'}

    def to_internal_value(self, data):
        upload = super().to_internal_value(data)
        name = upload.name.lower()
        content_type = getattr(upload, 'content_type', '') or ''
        import os
        if os.path.splitext(name)[1] not in self.allowed_extensions or not content_type.startswith('image/'):
            raise serializers.ValidationError('Upload a JPG, PNG, or WebP image.')
        if upload.size > 10 * 1024 * 1024:
            raise serializers.ValidationError('Image must be 10 MB or smaller.')
        return upload

class ExpenseSplitSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExpenseSplit
        fields = ['user', 'owed_amount']

class ExpenseSerializer(serializers.ModelSerializer):
    splits = ExpenseSplitSerializer(many=True, write_only=True)
    receipt_image = ScreenshotField(required=False, allow_null=True)
    class Meta:
        model = Expense
        fields = ['id', 'group', 'paid_by', 'description', 'total_amount', 'category', 'splits', 'receipt_image']

    def to_internal_value(self, data):
        if hasattr(data, 'get') and isinstance(data.get('splits'), str):
            try:
                data = data.dict() if hasattr(data, 'dict') else dict(data)
                data['splits'] = json.loads(data['splits'])
            except json.JSONDecodeError:
                raise serializers.ValidationError({'splits': 'Provide splits as a valid JSON list.'})
        return super().to_internal_value(data)

    def validate(self, attrs):
        if self.instance is not None:
            return attrs
        group = attrs.get('group')
        members = set(GroupMember.objects.filter(group=group).values_list('user_id', flat=True))
        paid_by = attrs.get('paid_by')
        if paid_by and paid_by.id not in members:
            raise serializers.ValidationError({'paid_by': 'The payer must be a member of this group.'})
        splits = attrs.get('splits', [])
        split_users = [item['user'].id for item in splits]
        if len(split_users) != len(set(split_users)):
            raise serializers.ValidationError({'splits': 'Each member can appear only once.'})
        if not split_users or any(user_id not in members for user_id in split_users):
            raise serializers.ValidationError({'splits': 'Choose one or more members of this group.'})
        if sum((item['owed_amount'] for item in splits), start=0) != attrs.get('total_amount'):
            raise serializers.ValidationError({'splits': 'Split amounts must add up to the total expense amount.'})
        return attrs

    def create(self, validated_data):
        from django.db import transaction
        splits_data = validated_data.pop('splits')
        with transaction.atomic():               # ← this is your ACID demo
            expense = Expense.objects.create(**validated_data)
            for split in splits_data:
                ExpenseSplit.objects.create(expense=expense, **split)
        return expense


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password']
    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email']
        read_only_fields = ['id']

class GroupMemberSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = GroupMember
        fields = ['id', 'group', 'user', 'username', 'joined_at', 'role']
        read_only_fields = ['id', 'joined_at', 'role']

    def validate(self, attrs):
        group, user = attrs.get('group'), attrs.get('user')
        if group and user and GroupMember.objects.filter(group=group, user=user).exists():
            raise serializers.ValidationError({'user': 'This user is already a member of the group.'})
        return attrs

class SettlementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Settlement
        fields = '__all__'

class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = '__all__'

# core/serializers.py
class SettlementNestedSerializer(serializers.ModelSerializer):
    from_username = serializers.CharField(source='from_user.username', read_only=True)
    to_username = serializers.CharField(source='to_user.username', read_only=True)

    class Meta:
        model = Settlement
        fields = ['id', 'group', 'from_user', 'from_username', 'to_user', 'to_username', 'amount']

class PaymentSerializer(serializers.ModelSerializer):
    settlement_detail = SettlementNestedSerializer(source='settlement', read_only=True)
    receipt_image = ScreenshotField(required=False, allow_null=True)
    class Meta:
        model = Payment
        fields = ['id', 'settlement', 'settlement_detail', 'amount_paid', 'payment_date', 'payment_method', 'transaction_reference', 'receipt_image']
