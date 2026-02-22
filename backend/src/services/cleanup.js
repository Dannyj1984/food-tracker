/**
 * 30-day data cleanup service
 * Deletes food_log and water_log entries older than 30 days
 */
export async function cleanupOldEntries(prisma) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);

    const [foodDeleted, waterDeleted, exerciseDeleted] = await prisma.$transaction([
        prisma.foodLog.deleteMany({
            where: { date: { lt: cutoffDate } },
        }),
        prisma.waterLog.deleteMany({
            where: { date: { lt: cutoffDate } },
        }),
        prisma.exerciseLog.deleteMany({
            where: { date: { lt: cutoffDate } },
        }),
    ]);

    console.log(`[CLEANUP] Deleted ${foodDeleted.count} food logs, ${waterDeleted.count} water logs, ${exerciseDeleted.count} exercise logs older than 30 days`);
    return { foodDeleted: foodDeleted.count, waterDeleted: waterDeleted.count, exerciseDeleted: exerciseDeleted.count };
}
