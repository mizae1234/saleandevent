// Channel Actions - Barrel Export
// Re-exports all channel actions for backward-compatible imports

export { createChannelWithDetails } from './create';
export { updateChannelWithDetails } from './update';
export { submitChannel, approveChannel } from './approval';
export { closeChannelStock, createReturnShipment, confirmReturnReceived, closeChannelManual } from './closing';
export { addChannelExpense, removeChannelExpense } from './expense';
export { getChannelCompensationSummary, saveStaffCompensation, updateEmployeeCompensation } from './compensation';
export { submitForPaymentApproval, approvePayment } from './payment';
export { updateStaffDailyRate, toggleWagePaid, toggleCommissionPaid, markAllWagePaid, markAllCommissionPaid, submitPayroll } from './payroll';
export { addStaffToChannel, removeStaffFromChannel } from './staff';
