from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import (GroupViewSet, ExpenseViewSet, GroupMemberViewSet,
                     SettlementViewSet, PaymentViewSet, GroupBalanceView, SettleUpView,
                     UserSearchView)

router = DefaultRouter()
router.register('groups', GroupViewSet, basename='group')
router.register('expenses', ExpenseViewSet, basename='expense')
router.register('group-members', GroupMemberViewSet, basename='group-member')
router.register('settlements', SettlementViewSet, basename='settlement')
router.register('payments', PaymentViewSet, basename='payment')

urlpatterns = router.urls + [
    path('users/', UserSearchView.as_view()),
    path('groups/<int:group_id>/balances/', GroupBalanceView.as_view()),
    path('groups/<int:group_id>/settle-up/', SettleUpView.as_view()),
]
