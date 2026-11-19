def simplify_debts(balances):  # {user_id: net_amount}
    creditors = sorted([(u, b) for u, b in balances.items() if b > 0], key=lambda x: -x[1])
    debtors = sorted([(u, b) for u, b in balances.items() if b < 0], key=lambda x: x[1])
    transactions, i, j = [], 0, 0
    while i < len(debtors) and j < len(creditors):
        d_user, d_amt = debtors[i]
        c_user, c_amt = creditors[j]
        settle = min(-d_amt, c_amt)
        transactions.append((d_user, c_user, round(settle, 2)))
        debtors[i] = (d_user, d_amt + settle)
        creditors[j] = (c_user, c_amt - settle)
        if debtors[i][1] == 0: i += 1
        if creditors[j][1] == 0: j += 1
    return transactions