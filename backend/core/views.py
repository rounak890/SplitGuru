from django.shortcuts import render
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from .models import Group, Expense
from .serializers import GroupSerializer, ExpenseSerializer


from django.db import connection
from django.db import transaction
from django.db.models import Q
from django.contrib.auth.models import User
from rest_framework.views import APIView
from rest_framework.generics import CreateAPIView
from rest_framework.response import Response
from rest_framework import viewsets, permissions
from .models import GroupMember, Settlement, Payment
from .serializers import RegisterSerializer, GroupMemberSerializer, SettlementSerializer, PaymentSerializer, ProfileSerializer
from .utils import simplify_debts

# Create your views here.
# core/views.py

class GroupViewSet(viewsets.ModelViewSet):
    serializer_class = GroupSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Group.objects.filter(groupmember__user=self.request.user).distinct()

    @action(detail=False, methods=['get'], url_path='discover')
    def discover(self, request):
        """Groups the signed-in user can join."""
        groups = Group.objects.exclude(groupmember__user=request.user).select_related('created_by')
        search = request.query_params.get('search', '').strip()
        if search:
            if search.isdigit():
                groups = groups.filter(Q(pk=int(search)) | Q(group_name__icontains=search))
            else:
                groups = groups.filter(group_name__icontains=search)
        serializer = self.get_serializer(groups, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='join')
    def join(self, request, pk=None):
        """Let an authenticated user join a discoverable group."""
        group = Group.objects.filter(pk=pk).first()
        if group is None:
            from rest_framework.exceptions import NotFound
            raise NotFound('Group not found.')
        membership, created = GroupMember.objects.get_or_create(
            group=group,
            user=request.user,
            defaults={'role': 'member'},
        )
        if not created:
            return Response({'detail': 'You are already a member of this group.'}, status=200)
        return Response(GroupMemberSerializer(membership).data, status=201)

    def perform_create(self, serializer):
        with transaction.atomic():
            group = serializer.save(created_by=self.request.user)
            GroupMember.objects.get_or_create(
                group=group,
                user=self.request.user,
                defaults={'role': 'admin'},
            )

    def _require_admin(self, group):
        membership = GroupMember.objects.filter(group=group, user=self.request.user).first()
        if not membership or membership.role != 'admin':
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Only group admins can change group details.')

    def perform_update(self, serializer):
        self._require_admin(serializer.instance)
        serializer.save()

    def perform_destroy(self, instance):
        self._require_admin(instance)
        instance.delete()

# class ExpenseViewSet(viewsets.ModelViewSet):
#     queryset = Expense.objects.all()
#     serializer_class = ExpenseSerializer
#     permission_classes = [permissions.IsAuthenticated]


class RegisterView(CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

# class GroupMemberViewSet(viewsets.ModelViewSet):
#     queryset = GroupMember.objects.all()
#     serializer_class = GroupMemberSerializer
#     permission_classes = [permissions.IsAuthenticated]

class SettlementViewSet(viewsets.ModelViewSet):
    serializer_class = SettlementSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Settlement.objects.filter(group__groupmember__user=self.request.user).distinct()

    def perform_create(self, serializer):
        group = serializer.validated_data['group']
        if not GroupMember.objects.filter(group=group, user=self.request.user).exists():
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('You must belong to this group to create a settlement.')
        serializer.save()

class PaymentViewSet(viewsets.ModelViewSet):
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Payment.objects.filter(settlement__group__groupmember__user=self.request.user).distinct()

    def perform_create(self, serializer):
        settlement = serializer.validated_data['settlement']
        if not GroupMember.objects.filter(group=settlement.group, user=self.request.user).exists():
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('You must belong to this group to record a payment.')
        serializer.save()

# --- this is one of your "brag queries" — raw SQL, not ORM ---
class GroupBalanceView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, group_id):
        if not GroupMember.objects.filter(group_id=group_id, user=request.user).exists():
            from rest_framework.exceptions import NotFound
            raise NotFound('Group not found.')
        sql = """
            SELECT u.id AS user_id, u.username,
              COALESCE(paid.total_paid, 0) AS total_paid,
              COALESCE(owed.total_owed, 0) AS total_owed,
              COALESCE(paid.total_paid, 0) - COALESCE(owed.total_owed, 0)
                + COALESCE(sent.total_sent, 0) - COALESCE(received.total_received, 0) AS net_balance
            FROM auth_user u
            JOIN group_members gm ON gm.user_id = u.id AND gm.group_id = %s
            LEFT JOIN (
              SELECT paid_by_id, SUM(total_amount) AS total_paid
              FROM expenses WHERE group_id = %s GROUP BY paid_by_id
            ) paid ON paid.paid_by_id = u.id
            LEFT JOIN (
              SELECT es.user_id, SUM(es.owed_amount) AS total_owed
              FROM expense_splits es JOIN expenses e ON es.expense_id = e.id
              WHERE e.group_id = %s GROUP BY es.user_id
            ) owed ON owed.user_id = u.id
            LEFT JOIN (
              SELECT s.to_user_id AS user_id, SUM(p.amount_paid) AS total_received
              FROM payments p JOIN settlements s ON s.id = p.settlement_id
              WHERE s.group_id = %s GROUP BY s.to_user_id
            ) received ON received.user_id = u.id
            LEFT JOIN (
              SELECT s.from_user_id AS user_id, SUM(p.amount_paid) AS total_sent
              FROM payments p JOIN settlements s ON s.id = p.settlement_id
              WHERE s.group_id = %s GROUP BY s.from_user_id
            ) sent ON sent.user_id = u.id;
        """
        with connection.cursor() as cursor:
            cursor.execute(sql, [group_id, group_id, group_id, group_id, group_id])
            cols = [c[0] for c in cursor.description]
            rows = [dict(zip(cols, r)) for r in cursor.fetchall()]
        return Response(rows)

class SettleUpView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, group_id):
        balances_data = GroupBalanceView().get(request, group_id).data
        balances = {row['user_id']: float(row['net_balance']) for row in balances_data}
        txns = simplify_debts(balances)
        return Response([{'from_user': f, 'to_user': t, 'amount': a} for f, t, a in txns])

# core/views.py — replace GroupMemberViewSet and ExpenseViewSet with these

class GroupMemberViewSet(viewsets.ModelViewSet):
    serializer_class = GroupMemberSerializer
    permission_classes = [permissions.IsAuthenticated]
    def get_queryset(self):
        qs = GroupMember.objects.filter(group__groupmember__user=self.request.user).distinct()
        group_id = self.request.query_params.get('group')
        if group_id:
            qs = qs.filter(group_id=group_id)
        return qs

    def perform_create(self, serializer):
        group = serializer.validated_data['group']
        membership = GroupMember.objects.filter(group=group, user=self.request.user).first()
        if not membership or membership.role != 'admin':
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Only group admins can add members.')
        serializer.save()

    def perform_destroy(self, instance):
        membership = GroupMember.objects.filter(group=instance.group, user=self.request.user).first()
        if not membership or membership.role != 'admin':
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Only group admins can remove members.')
        instance.delete()

class ExpenseViewSet(viewsets.ModelViewSet):
    serializer_class = ExpenseSerializer
    permission_classes = [permissions.IsAuthenticated]
    def get_queryset(self):
        qs = Expense.objects.filter(group__groupmember__user=self.request.user).distinct()
        group_id = self.request.query_params.get('group')
        if group_id:
            qs = qs.filter(group_id=group_id)
        return qs

    def perform_create(self, serializer):
        group = serializer.validated_data['group']
        if not GroupMember.objects.filter(group=group, user=self.request.user).exists():
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('You must belong to this group to add an expense.')
        serializer.save()

# add a tiny "who am I" endpoint
class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    def get(self, request):
        return Response(ProfileSerializer(request.user).data)

    def patch(self, request):
        serializer = ProfileSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class UserSearchView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        query = request.query_params.get('search', '').strip()
        if len(query) < 2:
            return Response([])
        users = User.objects.filter(username__icontains=query, is_active=True).order_by('username')[:20]
        return Response([{'id': user.id, 'username': user.username} for user in users])
