import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

export function useCreateIntent(onCreate: () => void) {
    const [searchParams] = useSearchParams();
    const handledRef = useRef(false);

    useEffect(() => {
        if (handledRef.current) return;
        if (searchParams.get('new') !== '1') return;

        handledRef.current = true;
        onCreate();
    }, [onCreate, searchParams]);
}
