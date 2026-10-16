/** 201 means stored + notified; 202 means stored but notification needs follow-up. */
export function contactDeliveryStatus(notificationDelivered: boolean): 201 | 202 {
    return notificationDelivered ? 201 : 202;
}
