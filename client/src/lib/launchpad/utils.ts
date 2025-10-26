export const formatMonthsPeriod = (periodInSeconds: number) => {
    if (!periodInSeconds) return 'None';

    // Constants for time calculations
    const MINUTE = 60;
    const HOUR = MINUTE * 60;
    const DAY = HOUR * 24;
    const MONTH = DAY * 30;

    if (periodInSeconds >= MONTH) {
        const months = Math.round(periodInSeconds / MONTH);
        return `${months} month${months !== 1 ? 's' : ''}`;
    } else if (periodInSeconds >= DAY) {
        const days = Math.round(periodInSeconds / DAY);
        return `${days} day${days !== 1 ? 's' : ''}`;
    } else if (periodInSeconds >= HOUR) {
        const hours = Math.round(periodInSeconds / HOUR);
        return `${hours} hour${hours !== 1 ? 's' : ''}`;
    } else {
        const minutes = Math.max(1, Math.round(periodInSeconds / MINUTE));
        return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
};

export const formatDate = (date: string) => {
    return new Date(date).toLocaleString('en-US', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });
};

export const formatNumber = (number: number, decimals: number = 2) => {
    return Intl.NumberFormat('en-us', { style: 'decimal', maximumFractionDigits: decimals }).format(number);
};

export enum IcoStatus {
    Closed = 'Closed',
    SoldOut = 'Sold Out',
    Upcoming = 'Upcoming',
    Live = 'Live',
    Ended = 'Ended',
}

export const getStatus = (
    isClosed: number,
    amount: number,
    totalSold: number,
    startDate: string,
    now: string,
    endDate: string,
): { status: IcoStatus; color: string } => {
    if (isClosed) {
        return {
            status: IcoStatus.Closed,
            color: 'error',
        };
    } else if (amount === totalSold) {
        return {
            status: IcoStatus.SoldOut,
            color: 'warning',
        };
    } else if (Number(startDate) > Number(now)) {
        return {
            status: IcoStatus.Upcoming,
            color: 'warning',
        };
    } else if (!Number(endDate) || Number(endDate) > Number(now)) {
        return {
            status: IcoStatus.Live,
            color: 'success',
        };
    } else {
        return {
            status: IcoStatus.Ended,
            color: 'error',
        };
    }
};
