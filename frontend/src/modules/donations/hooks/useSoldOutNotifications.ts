import {
    useEffect,
    useRef,
    useState,
} from 'react';
import { useLocation } from 'react-router-dom';
import {
    getStoredToken,
    getStoredUser,
} from '@/services/authStorage';
import { donorRealtimeService } from '../services/donorRealtime.service';
import { soldOutAlertSoundService } from '../services/soldOutAlertSound.service';
import type {
    SoldOutEvent,
} from '../types';

export interface SoldOutAlert
    extends SoldOutEvent {
    id: string;
}

const ALERT_DURATION_MS = 8000;

// Connects authenticated Donors and owns transient C9 alerts.
export function useSoldOutNotifications() {
    useLocation();

    const user =
        getStoredUser();

    const token =
        getStoredToken();

    const [alerts, setAlerts] =
        useState<SoldOutAlert[]>([]);

    const sequenceRef =
        useRef(0);

    const timeoutIdsRef =
        useRef<Map<string, number>>(
            new Map(),
        );

    function dismissAlert(
        alertId: string,
    ) {
        const timeoutId =
            timeoutIdsRef.current.get(
                alertId,
            );

        if (timeoutId !== undefined) {
            window.clearTimeout(timeoutId);
            timeoutIdsRef.current.delete(
                alertId,
            );
        }

        setAlerts((current) =>
            current.filter(
                (alert) =>
                    alert.id !== alertId,
            ),
        );
    }

    useEffect(() => {
        function prepareSound() {
            soldOutAlertSoundService.prepare();
        }

        window.addEventListener(
            'pointerdown',
            prepareSound,
            { once: true },
        );

        window.addEventListener(
            'keydown',
            prepareSound,
            { once: true },
        );

        return () => {
            window.removeEventListener(
                'pointerdown',
                prepareSound,
            );

            window.removeEventListener(
                'keydown',
                prepareSound,
            );
        };
    }, []);

    useEffect(() => {
        const unsubscribe =
            donorRealtimeService
                .subscribeToSoldOut(
                    (event) => {
                        sequenceRef.current += 1;

                        const alert: SoldOutAlert = {
                            ...event,
                            id:
                                `${event.listingId}-`
                                + `${Date.now()}-`
                                + sequenceRef.current,
                        };

                        // The same event handler triggers both required alert forms.
                        soldOutAlertSoundService.play();

                        setAlerts((current) => [
                            ...current,
                            alert,
                        ]);

                        const timeoutId =
                            window.setTimeout(
                                () => {
                                    dismissAlert(alert.id);
                                },
                                ALERT_DURATION_MS,
                            );

                        timeoutIdsRef.current.set(
                            alert.id,
                            timeoutId,
                        );
                    },
                );

        return unsubscribe;
    }, []);

    useEffect(() => {
        const isAuthenticatedDonor =
            user?.role === 'DONOR'
            && Boolean(token);

        if (
            !isAuthenticatedDonor
            || !token
        ) {
            donorRealtimeService.disconnect();
            setAlerts([]);
            return;
        }

        donorRealtimeService.connect(token);

        return () => {
            donorRealtimeService.disconnect();
        };
    }, [
        token,
        user?.id,
        user?.role,
    ]);

    useEffect(
        () => () => {
            timeoutIdsRef.current.forEach(
                (timeoutId) => {
                    window.clearTimeout(
                        timeoutId,
                    );
                },
            );

            timeoutIdsRef.current.clear();
        },
        [],
    );

    return {
        alerts,
        dismissAlert,
    };
}

export default useSoldOutNotifications;