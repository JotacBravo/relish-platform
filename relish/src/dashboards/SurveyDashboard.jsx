// Dashboard engine shared by the three survey dashboards.
import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import axios from 'axios';
import { initEvalTelemetry } from '../eval/evalTelemetry';
import cloud from 'd3-cloud';
import { scaleLinear } from 'd3-scale';
import * as d3 from 'd3';
import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend,
    CategoryScale,
    LinearScale,
    BarElement
} from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const theme = {
    accent: '#FF7F6F',
    accentLight: '#ff9f93',
    textDark: '#333333',
    textLight: '#666666',
    bgLight: '#f2f2f2',
    white: '#ffffff',
    shadow: '0 4px 12px rgba(0,0,0,0.05)'
};

const chartPalette = [
    theme.accent, '#FFB347', '#FFDC60', '#6BCB77', '#4D96FF', '#9B72AA',
    '#FF9A8B', '#FF6A88', '#D4A5A5', '#9DC88D'
];

const styles = {
    pageContainer: { backgroundColor: theme.bgLight, minHeight: '100vh', padding: '40px 20px', fontFamily: "'Lato', sans-serif" },
    contentWrapper: { maxWidth: '1200px', margin: '0 auto' },
    header: { marginBottom: '40px', textAlign: 'center' },
    mainTitle: { color: theme.textDark, fontSize: '32px', fontWeight: '700', margin: '0 0 10px 0', fontFamily: "'Merriweather', serif" },
    subTitle: { color: theme.textLight, fontSize: '16px', margin: 0, display: 'inline-block', borderBottom: `3px solid ${theme.accent}`, paddingBottom: '10px', fontFamily: "'Lato', sans-serif" },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(400px, 100%), 1fr))', gap: '30px' },
    card: { backgroundColor: theme.white, borderRadius: '12px', boxShadow: theme.shadow, padding: '30px', border: '1px solid #eee', display: 'flex', flexDirection: 'column', alignItems: 'center' },
    questionTitle: { color: theme.textDark, fontSize: '18px', fontWeight: '600', marginBottom: '6px', marginTop: 0, textAlign: 'center', width: '100%', fontFamily: "'Merriweather', serif" },
    questionDescription: { color: 'rgba(0, 0, 0, 0.35)', fontSize: '13px', fontStyle: 'italic', marginBottom: '20px', marginTop: 0, textAlign: 'center', width: '100%', lineHeight: '1.5', fontFamily: "'Lato', sans-serif" },
};

// Date helper
const formatDateSafe = (dateStr, opts) => {
    if (!dateStr) return null;
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return null;
        return d.toLocaleDateString('en-GB', opts);
    } catch (_) {
        return null;
    }
};

const formatDateShort = (dateStr) =>
    formatDateSafe(dateStr, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const formatDateLong = (dateStr) =>
    formatDateSafe(dateStr, { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

// CSV export helper
const CSV_HIDDEN_KEYS = new Set(['email']);

const downloadCSV = (data, filename = 'survey_data.csv') => {
    if (!data || data.length === 0) return;
    const allKeys = Array.from(
        data.reduce((set, row) => { Object.keys(row).forEach(k => set.add(k)); return set; }, new Set())
    ).filter(k => !CSV_HIDDEN_KEYS.has(k));
    const escape = (val) => {
        if (val === null || val === undefined) return '';
        const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
        if (str.includes(',') || str.includes('\n') || str.includes('"')) return `"${str.replace(/"/g, '""')}"`;
        return str;
    };
    const rows = [allKeys.join(','), ...data.map(row => allKeys.map(k => escape(row[k])).join(','))];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = filename; link.click();
    URL.revokeObjectURL(url);
};

// Individual Response Viewer
const HIDDEN_KEYS = ['_id', 'createdAt', '__v', 'surveyType', 'updatedAt', 'email'];

const formatValue = (value) => {
    if (typeof value === 'object' && value !== null) {
        return (
            <ul style={{ margin: 0, padding: '0 0 0 16px', listStyle: 'disc' }}>
                {Object.entries(value).map(([k, v]) => (
                    <li key={k} style={{ marginBottom: '2px' }}>
                        <span style={{ color: theme.textLight }}>{k.replace(/_/g, ' ')}: </span>
                        <span>{String(v)}</span>
                    </li>
                ))}
            </ul>
        );
    }
    if (Array.isArray(value)) return value.join(', ');
    return String(value);
};

const IndividualViewer = memo(({ surveyData, selectedRespondent, setSelectedRespondent, showIndividual, setShowIndividual, formattedDates }) => {
    const respondent = selectedRespondent !== null ? surveyData[selectedRespondent] : null;

    return (
        <div style={{
            backgroundColor: theme.white, borderRadius: '12px', boxShadow: theme.shadow,
            border: '1px solid #eee', marginBottom: '0px', overflow: 'hidden', fontFamily: "'Lato', sans-serif",
        }}>
            <div
                onClick={() => setShowIndividual(prev => !prev)}
                style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '18px 28px', cursor: 'pointer',
                    backgroundColor: showIndividual ? theme.accent : theme.white,
                    transition: 'background-color 0.2s', userSelect: 'none',
                }}
            >
                <span style={{ fontWeight: '600', fontSize: '16px', color: showIndividual ? theme.white : theme.textDark, fontFamily: "'Lato', sans-serif" }}>
                    🔍 Individual Response Viewer
                </span>
                <span style={{ color: showIndividual ? theme.white : theme.textLight, fontSize: '18px' }}>
                    {showIndividual ? '▲' : '▼'}
                </span>
            </div>

            {showIndividual && (
                <div style={{ padding: '24px 28px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
                        <button
                            onClick={() => setSelectedRespondent(prev => Math.max(0, (prev ?? 0) - 1))}
                            disabled={selectedRespondent === null || selectedRespondent === 0}
                            style={{
                                padding: '7px 14px', borderRadius: '8px', border: `1px solid ${theme.accent}`,
                                backgroundColor: theme.white, color: theme.accent, cursor: 'pointer',
                                fontWeight: '600', fontSize: '16px', lineHeight: 1, fontFamily: "'Lato', sans-serif",
                                opacity: (selectedRespondent === null || selectedRespondent === 0) ? 0.35 : 1,
                            }}
                        >‹</button>

                        <select
                            value={selectedRespondent ?? ''}
                            onChange={e => setSelectedRespondent(e.target.value === '' ? null : Number(e.target.value))}
                            style={{
                                padding: '8px 14px', borderRadius: '8px', border: `1px solid ${theme.accent}`,
                                fontSize: '14px', color: theme.textDark, backgroundColor: theme.white,
                                cursor: 'pointer', outline: 'none', minWidth: '260px', fontFamily: "'Lato', sans-serif",
                            }}
                        >
                            <option value="">— select a response —</option>
                            {surveyData.map((_, i) => (
                                <option key={i} value={i}>
                                    #{i + 1} — {formattedDates[i] ?? `Response ${i + 1}`}
                                </option>
                            ))}
                        </select>

                        <button
                            onClick={() => setSelectedRespondent(prev => Math.min(surveyData.length - 1, (prev ?? -1) + 1))}
                            disabled={selectedRespondent === surveyData.length - 1}
                            style={{
                                padding: '7px 14px', borderRadius: '8px', border: `1px solid ${theme.accent}`,
                                backgroundColor: theme.white, color: theme.accent, cursor: 'pointer',
                                fontWeight: '600', fontSize: '16px', lineHeight: 1, fontFamily: "'Lato', sans-serif",
                                opacity: selectedRespondent === surveyData.length - 1 ? 0.35 : 1,
                            }}
                        >›</button>

                        {respondent && (
                            <span style={{ fontSize: '13px', color: theme.textLight, marginLeft: '4px' }}>
                                {selectedRespondent + 1} of {surveyData.length}
                            </span>
                        )}
                    </div>

                    {respondent ? (
                        <>
                            <div style={{ fontSize: '13px', color: theme.textLight, marginBottom: '20px', paddingBottom: '14px', borderBottom: '1px solid #eee' }}>
                                Response #{selectedRespondent + 1} · Submitted on{' '}
                                <strong style={{ color: theme.textDark }}>
                                    {formatDateLong(respondent.createdAt) ?? '—'}
                                </strong>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))', gap: '12px' }}>
                                {Object.entries(respondent)
                                    .filter(([key, v]) => !HIDDEN_KEYS.includes(key) && v !== null && v !== undefined && v !== '')
                                    .map(([key, value]) => (
                                        <div key={key} style={{ backgroundColor: theme.bgLight, borderRadius: '8px', padding: '12px 16px', borderLeft: `3px solid ${theme.accent}` }}>
                                            <div style={{ fontSize: '11px', color: theme.textLight, fontWeight: '700', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: "'Lato', sans-serif" }}>
                                                {key.replace(/_/g, ' ')}
                                            </div>
                                            <div style={{ fontSize: '14px', color: theme.textDark, wordBreak: 'break-word', lineHeight: '1.5', fontFamily: "'Lato', sans-serif" }}>
                                                {formatValue(value)}
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </>
                    ) : (
                        <p style={{ color: theme.textLight, fontStyle: 'italic', margin: 0, fontFamily: "'Lato', sans-serif" }}>
                            Select a response above to view the answers.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
});

// Matrix Card
const stackedPalette = ['#FFE0DC', '#FFB347', '#FF7F6F', '#C94F3A'];

const MatrixCard = memo(({ title, description, counts, rowLabels, rowValues, columnLabels, columnValues, note }) => {
    const tooltipRef = useRef(null);
    const containerRef = useRef(null);

    const hasData = rowValues.some(rv => columnValues.some(cv => counts[rv][cv] > 0));
    if (!hasData) return null;

    const chartData = {
        labels: rowLabels,
        datasets: columnValues.map((cv, i) => ({
            label: columnLabels[i],
            data: rowValues.map(rv => counts[rv][cv]),
            backgroundColor: stackedPalette[i % stackedPalette.length],
            borderColor: theme.white,
            borderWidth: 1,
        })),
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
            legend: {
                display: true, position: 'bottom',
                labels: { color: theme.textLight, usePointStyle: true, padding: 16, font: { family: "'Lato', sans-serif" } }
            },
            tooltip: {
                enabled: false,
                external: (context) => {
                    const { chart, tooltip: t } = context;
                    if (!containerRef.current || !tooltipRef.current) return;
                    if (t.opacity === 0) {
                        tooltipRef.current.style.display = 'none';
                        return;
                    }
                    const rect = chart.canvas.getBoundingClientRect();
                    const containerRect = containerRef.current.getBoundingClientRect();
                    const x = rect.left - containerRect.left + t.caretX;
                    const y = rect.top - containerRect.top + t.caretY - 42;
                    const dp = t.dataPoints?.[0];
                    if (!dp) return;
                    tooltipRef.current.style.display = 'block';
                    tooltipRef.current.style.left = `${x}px`;
                    tooltipRef.current.style.top = `${y}px`;
                    tooltipRef.current.textContent = `${dp.dataset.label}: ${dp.raw}`;
                }
            }
        },
        scales: {
            x: { stacked: true, beginAtZero: true, ticks: { precision: 0, stepSize: 25, font: { family: "'Lato', sans-serif" } }, grid: { display: false } },
            y: { stacked: true, ticks: { font: { family: "'Lato', sans-serif" } } },
        }
    };

    const chartHeight = Math.max(300, rowLabels.length * 50 + 80);

    return (
        <div style={{ ...styles.card, gridColumn: '1 / -1' }}>
            <h2 style={styles.questionTitle}>{title}</h2>
            {description && <p style={styles.questionDescription}>{description}</p>}
            <div ref={containerRef} style={{ height: `${chartHeight}px`, width: '100%', position: 'relative' }}>
                <div
                    ref={tooltipRef}
                    style={{
                        display: 'none', position: 'absolute', transform: 'translateX(-50%)',
                        backgroundColor: 'rgba(50,50,50,0.85)', color: '#fff',
                        padding: '5px 10px', borderRadius: '6px', fontSize: '13px',
                        pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 10,
                        fontFamily: "'Lato', sans-serif",
                    }}
                />
                <Bar data={chartData} options={options} />
            </div>
            {note}
        </div>
    );
});

// Word Cloud Card
const WordCloudCard = memo(({ title, description, words, note }) => {
    const [layoutWords, setLayoutWords] = useState([]);
    const [svgSize, setSvgSize] = useState({ w: 600, h: 380 });
    const tooltipRef = useRef(null);
    const containerRef = useRef(null);

    useEffect(() => {
        if (words.length === 0) return;
        const w = containerRef.current?.offsetWidth || 600;
        const h = 380;
        setSvgSize({ w, h });
        const maxVal = Math.max(...words.map(d => d.value));
        const minVal = Math.min(...words.map(d => d.value));
        const fontScale = scaleLinear().domain([minVal, maxVal]).range([13, 62]);
        cloud()
            .size([w, h])
            .words(words.map(d => ({ ...d, size: fontScale(d.value) })))
            .padding(4).rotate(0).font("'Lato', sans-serif").fontWeight('bold')
            .fontSize(d => d.size).spiral('archimedean')
            .on('end', setLayoutWords).start();
    }, [words]);

    if (words.length === 0) return null;

    const handleMouseMove = (e, word) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect || !tooltipRef.current) return;
        tooltipRef.current.style.display = 'block';
        tooltipRef.current.style.left = `${e.clientX - rect.left}px`;
        tooltipRef.current.style.top = `${e.clientY - rect.top - 36}px`;
        tooltipRef.current.textContent = `${word.text}: ${word.value} response${word.value !== 1 ? 's' : ''}`;
    };

    const handleMouseLeave = () => {
        if (tooltipRef.current) tooltipRef.current.style.display = 'none';
    };

    return (
        <div style={styles.card}>
            <h2 style={styles.questionTitle}>{title}</h2>
            {description && <p style={styles.questionDescription}>{description}</p>}
            <div ref={containerRef} style={{ width: '100%', height: `${svgSize.h}px`, position: 'relative' }}>
                <div
                    ref={tooltipRef}
                    style={{
                        display: 'none', position: 'absolute', transform: 'translateX(-50%)',
                        backgroundColor: 'rgba(50,50,50,0.85)', color: '#fff',
                        padding: '5px 10px', borderRadius: '6px', fontSize: '13px',
                        pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 10,
                        fontFamily: "'Lato', sans-serif",
                    }}
                />
                <svg width={svgSize.w} height={svgSize.h}>
                    <g transform={`translate(${svgSize.w / 2}, ${svgSize.h / 2})`}>
                        {layoutWords.map((word, i) => (
                            <text
                                key={i}
                                style={{ fontSize: `${word.size}px`, fontFamily: "'Lato', sans-serif", fontWeight: 'bold', fill: chartPalette[i % chartPalette.length], cursor: 'pointer' }}
                                textAnchor="middle"
                                transform={`translate(${word.x}, ${word.y}) rotate(${word.rotate})`}
                                onMouseMove={(e) => handleMouseMove(e, word)}
                                onMouseLeave={handleMouseLeave}
                            >
                                {word.text}
                            </text>
                        ))}
                    </g>
                </svg>
            </div>
            {note}
        </div>
    );
});

// Country names to ISO3 codes
const COUNTRY_NAME_TO_ISO3 = {
    'afghanistan': 'AFG', 'albania': 'ALB', 'algeria': 'DZA', 'angola': 'AGO',
    'argentina': 'ARG', 'armenia': 'ARM', 'australia': 'AUS', 'austria': 'AUT',
    'azerbaijan': 'AZE',
    'bahrain': 'BHR', 'bangladesh': 'BGD', 'belarus': 'BLR', 'belgium': 'BEL',
    'belize': 'BLZ', 'benin': 'BEN', 'bhutan': 'BTN', 'bolivia': 'BOL',
    'bosnia': 'BIH', 'bosnia and herzegovina': 'BIH', 'botswana': 'BWA',
    'brazil': 'BRA', 'brasil': 'BRA', 'brunei': 'BRN', 'bulgaria': 'BGR',
    'burkina faso': 'BFA', 'burundi': 'BDI',
    'cambodia': 'KHM', 'cameroon': 'CMR', 'canada': 'CAN', 'chad': 'TCD',
    'chile': 'CHL', 'china': 'CHN', 'colombia': 'COL', 'congo': 'COG',
    'democratic republic of the congo': 'COD', 'dr congo': 'COD',
    'costa rica': 'CRI', 'croatia': 'HRV', 'cuba': 'CUB', 'cyprus': 'CYP',
    'czech republic': 'CZE', 'czechia': 'CZE',
    'denmark': 'DNK', 'djibouti': 'DJI', 'dominican republic': 'DOM',
    'ecuador': 'ECU', 'egypt': 'EGY', 'el salvador': 'SLV',
    'equatorial guinea': 'GNQ', 'eritrea': 'ERI', 'estonia': 'EST',
    'ethiopia': 'ETH',
    'finland': 'FIN', 'france': 'FRA',
    'gabon': 'GAB', 'gambia': 'GMB', 'georgia': 'GEO', 'germany': 'DEU',
    'ghana': 'GHA', 'greece': 'GRC', 'guatemala': 'GTM', 'guinea': 'GIN',
    'guinea-bissau': 'GNB', 'guyana': 'GUY',
    'haiti': 'HTI', 'honduras': 'HND', 'hungary': 'HUN',
    'iceland': 'ISL', 'india': 'IND', 'indonesia': 'IDN', 'iran': 'IRN',
    'iraq': 'IRQ', 'ireland': 'IRL', 'israel': 'ISR', 'italy': 'ITA',
    'jamaica': 'JAM', 'japan': 'JPN', 'jordan': 'JOR',
    'kazakhstan': 'KAZ', 'kenya': 'KEN', 'kosovo': 'XKX', 'kuwait': 'KWT',
    'kyrgyzstan': 'KGZ',
    'laos': 'LAO', 'latvia': 'LVA', 'lebanon': 'LBN', 'lesotho': 'LSO',
    'liberia': 'LBR', 'libya': 'LBY', 'lithuania': 'LTU', 'luxembourg': 'LUX',
    'madagascar': 'MDG', 'malawi': 'MWI', 'malaysia': 'MYS', 'mali': 'MLI',
    'mauritania': 'MRT', 'mauritius': 'MUS', 'mexico': 'MEX', 'moldova': 'MDA',
    'mongolia': 'MNG', 'montenegro': 'MNE', 'morocco': 'MAR', 'mozambique': 'MOZ',
    'myanmar': 'MMR', 'burma': 'MMR',
    'namibia': 'NAM', 'nepal': 'NPL', 'netherlands': 'NLD', 'holland': 'NLD',
    'new zealand': 'NZL', 'nicaragua': 'NIC', 'niger': 'NER', 'nigeria': 'NGA',
    'north korea': 'PRK', 'north macedonia': 'MKD', 'norway': 'NOR',
    'oman': 'OMN',
    'pakistan': 'PAK', 'panama': 'PAN', 'paraguay': 'PRY', 'peru': 'PER',
    'philippines': 'PHL', 'poland': 'POL', 'portugal': 'PRT',
    'qatar': 'QAT',
    'romania': 'ROU', 'russia': 'RUS', 'russian federation': 'RUS', 'rwanda': 'RWA',
    'saudi arabia': 'SAU', 'senegal': 'SEN', 'serbia': 'SRB',
    'sierra leone': 'SLE', 'singapore': 'SGP', 'slovakia': 'SVK',
    'slovenia': 'SVN', 'somalia': 'SOM', 'south africa': 'ZAF',
    'south korea': 'KOR', 'korea': 'KOR', 'south sudan': 'SSD', 'spain': 'ESP',
    'sri lanka': 'LKA', 'sudan': 'SDN', 'suriname': 'SUR', 'sweden': 'SWE',
    'switzerland': 'CHE', 'syria': 'SYR',
    'taiwan': 'TWN', 'tajikistan': 'TJK', 'tanzania': 'TZA', 'thailand': 'THA',
    'timor-leste': 'TLS', 'east timor': 'TLS', 'togo': 'TGO', 'tunisia': 'TUN',
    'turkey': 'TUR', 'türkiye': 'TUR', 'turkmenistan': 'TKM',
    'uganda': 'UGA', 'ukraine': 'UKR', 'united arab emirates': 'ARE', 'uae': 'ARE',
    'united kingdom': 'GBR', 'uk': 'GBR', 'england': 'GBR', 'scotland': 'GBR',
    'wales': 'GBR', 'northern ireland': 'GBR',
    'united states': 'USA', 'usa': 'USA', 'us': 'USA', 'united states of america': 'USA',
    'uruguay': 'URY', 'uzbekistan': 'UZB',
    'venezuela': 'VEN', 'vietnam': 'VNM', 'viet nam': 'VNM',
    'yemen': 'YEM',
    'zambia': 'ZMB', 'zimbabwe': 'ZWE',
};

const normaliseCountry = (raw) => {
    if (!raw) return null;
    const lower = raw.trim().toLowerCase();
    return COUNTRY_NAME_TO_ISO3[lower] ?? null;
};

// Fullscreen overlay styles injected once
const MAP_FULLSCREEN_STYLE_ID = 'map-fullscreen-styles';
if (typeof document !== 'undefined' && !document.getElementById(MAP_FULLSCREEN_STYLE_ID)) {
    const style = document.createElement('style');
    style.id = MAP_FULLSCREEN_STYLE_ID;
    style.textContent = `
        @keyframes mapOverlayFadeIn {
            from { opacity: 0; }
            to   { opacity: 1; }
        }
        @keyframes mapModalSlideIn {
            from { opacity: 0; transform: scale(0.96) translateY(12px); }
            to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        .map-expand-btn:hover {
            background-color: ${theme.accent} !important;
            color: #fff !important;
            border-color: ${theme.accent} !important;
        }
        .map-close-btn:hover {
            background-color: rgba(255,255,255,0.15) !important;
        }
    `;
    document.head.appendChild(style);
}

// Reusable map renderer
const MapRenderer = ({ counts, svgRef, tooltipRef, containerRef }) => {
    const [geoData, setGeoData] = useState(null);
    const [error, setError] = useState(null);
    const [containerWidth, setContainerWidth] = useState(null);

    useEffect(() => {
        fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
            .then(r => r.json())
            .then(topo => {
                const { feature } = require('topojson-client');
                const world = feature(topo, topo.objects.countries);
                setGeoData(world);
            })
            .catch(() => setError('Could not load map data.'));
    }, []);

    useEffect(() => {
        if (!containerRef.current) return;
        const ro = new ResizeObserver(entries => {
            const w = entries[0]?.contentRect.width;
            if (w && w > 0) setContainerWidth(w);
        });
        ro.observe(containerRef.current);
        return () => ro.disconnect();
    }, [containerRef]);

    useEffect(() => {
        if (!geoData || !svgRef.current || !containerWidth) return;
        const container = containerRef.current;
        const width = containerWidth;
        const height = Math.round(width * 0.54);

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();
        svg
            .attr('viewBox', `0 0 ${width} ${height}`)
            .attr('preserveAspectRatio', 'xMidYMid meet')
            .style('width', '100%')
            .style('height', 'auto');

        const maxVal = Math.max(...Object.values(counts), 1);
        const colorScale = scaleLinear()
            .domain([0, maxVal])
            .range(['#FFE8E5', theme.accent]);

        const projection = d3.geoNaturalEarth1()
            .scale(width / 6.5)
            .translate([width / 2, height / 2]);

        const path = d3.geoPath().projection(projection);

        const countsByFeatureName = {};
        geoData.features.forEach(feat => {
            const name = feat.properties?.name ?? '';
            const iso3 = normaliseCountry(name);
            if (iso3 && counts[iso3]) {
                countsByFeatureName[feat.id] = counts[iso3];
            }
        });

        const tooltip = d3.select(tooltipRef.current);

        svg.append('g')
            .selectAll('path')
            .data(geoData.features)
            .join('path')
            .attr('d', path)
            .attr('fill', feat => {
                const val = countsByFeatureName[feat.id] ?? 0;
                return val > 0 ? colorScale(val) : '#E8E8E8';
            })
            .attr('stroke', '#fff')
            .attr('stroke-width', 0.5)
            .style('cursor', feat => (countsByFeatureName[feat.id] ? 'pointer' : 'default'))
            .on('mousemove', (event, feat) => {
                const val = countsByFeatureName[feat.id] ?? 0;
                if (val === 0) { tooltip.style('display', 'none'); return; }
                const rect = container.getBoundingClientRect();
                tooltip
                    .style('display', 'block')
                    .style('left', `${event.clientX - rect.left}px`)
                    .style('top', `${event.clientY - rect.top - 40}px`)
                    .text(`${feat.properties?.name}: ${val} respondent${val !== 1 ? 's' : ''}`);
            })
            .on('mouseleave', () => tooltip.style('display', 'none'));

        const legendWidth = 120;
        const legendHeight = 8;
        const legendX = width - legendWidth - 16;
        const legendY = height - 32;

        const defs = svg.append('defs');
        const grad = defs.append('linearGradient').attr('id', `mapLegendGrad-${Math.random().toString(36).slice(2)}`);
        grad.append('stop').attr('offset', '0%').attr('stop-color', '#FFE8E5');
        grad.append('stop').attr('offset', '100%').attr('stop-color', theme.accent);

        svg.append('rect')
            .attr('x', legendX).attr('y', legendY)
            .attr('width', legendWidth).attr('height', legendHeight)
            .attr('rx', 4).attr('fill', `url(#${grad.attr('id')})`);

        svg.append('text')
            .attr('x', legendX).attr('y', legendY - 4)
            .attr('font-size', 10).attr('fill', theme.textLight)
            .attr('font-family', "'Lato', sans-serif").text('0');

        svg.append('text')
            .attr('x', legendX + legendWidth).attr('y', legendY - 4)
            .attr('font-size', 10).attr('fill', theme.textLight)
            .attr('font-family', "'Lato', sans-serif")
            .attr('text-anchor', 'end').text(maxVal);

    }, [geoData, counts, containerWidth, svgRef, tooltipRef, containerRef]);

    if (error) return <p style={{ color: theme.textLight, fontFamily: "'Lato', sans-serif" }}>{error}</p>;
    return null;
};

// Country ranking list
const CountryRankingList = ({ counts }) => {
    const maxVal = counts[Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0]] || 1;
    return (
        <div style={{ marginTop: '20px', width: '100%' }}>
            {Object.entries(counts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([iso3, count], i) => {
                    const displayName = Object.entries(COUNTRY_NAME_TO_ISO3)
                        .find(([, v]) => v === iso3)?.[0] ?? iso3;
                    return (
                        <div key={iso3} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                            <span style={{ fontSize: '12px', color: theme.textLight, width: '16px', textAlign: 'right', fontFamily: "'Lato', sans-serif" }}>{i + 1}</span>
                            <span style={{ fontSize: '13px', color: theme.textDark, flex: '0 0 34%', maxWidth: '160px', textTransform: 'capitalize', fontFamily: "'Lato', sans-serif", whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: 1.25 }}>
                                {displayName}
                            </span>
                            <div style={{ flex: 1, backgroundColor: '#f0f0f0', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
                                <div style={{ width: `${(count / maxVal) * 100}%`, height: '100%', backgroundColor: theme.accent, borderRadius: '4px', transition: 'width 0.4s ease' }} />
                            </div>
                            <span style={{ fontSize: '12px', color: theme.textLight, width: '28px', textAlign: 'right', fontFamily: "'Lato', sans-serif" }}>{count}</span>
                        </div>
                    );
                })}
        </div>
    );
};

// Map Fullscreen Modal
const MapFullscreenModal = memo(({ title, description, counts, onClose, note }) => {
    const svgRef = useRef(null);
    const tooltipRef = useRef(null);
    const containerRef = useRef(null);

    // Close on Escape key
    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', handler);
            document.body.style.overflow = '';
        };
    }, [onClose]);

    return (
        <div
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
            style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                backgroundColor: 'rgba(0,0,0,0.65)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '24px',
                animation: 'mapOverlayFadeIn 0.2s ease',
            }}
        >
            <div
                style={{
                    backgroundColor: theme.white,
                    borderRadius: '16px',
                    boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
                    width: '100%',
                    maxWidth: '1100px',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    animation: 'mapModalSlideIn 0.25s ease',
                }}
            >
                {/* Modal header */}
                <div style={{
                    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                    padding: '24px 28px 16px',
                    borderBottom: '1px solid #eee',
                    position: 'sticky', top: 0, backgroundColor: theme.white,
                    borderRadius: '16px 16px 0 0', zIndex: 1,
                }}>
                    <div>
                        <h2 style={{ ...styles.questionTitle, textAlign: 'left', margin: 0 }}>{title}</h2>
                        {description && (
                            <p style={{ ...styles.questionDescription, textAlign: 'left', margin: '6px 0 0', fontSize: '13px' }}>
                                {description}
                            </p>
                        )}
                    </div>
                    <button
                        className="map-close-btn"
                        onClick={onClose}
                        title="Close (Esc)"
                        style={{
                            marginLeft: '16px',
                            flexShrink: 0,
                            width: '36px', height: '36px',
                            borderRadius: '8px',
                            border: 'none',
                            backgroundColor: 'rgba(0,0,0,0.06)',
                            color: theme.textDark,
                            fontSize: '18px',
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'background-color 0.15s',
                            fontFamily: "'Lato', sans-serif",
                            lineHeight: 1,
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* Modal body */}
                <div style={{ padding: '20px 28px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div ref={containerRef} style={{ width: '100%', position: 'relative' }}>
                        <div
                            ref={tooltipRef}
                            style={{
                                display: 'none', position: 'absolute', transform: 'translateX(-50%)',
                                backgroundColor: 'rgba(50,50,50,0.85)', color: '#fff',
                                padding: '5px 10px', borderRadius: '6px', fontSize: '13px',
                                pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 10,
                                fontFamily: "'Lato', sans-serif",
                            }}
                        />
                        <svg ref={svgRef} style={{ width: '100%', display: 'block' }} />
                        <MapRenderer counts={counts} svgRef={svgRef} tooltipRef={tooltipRef} containerRef={containerRef} />
                    </div>
                    <CountryRankingList counts={counts} />
                    {note}
                </div>
            </div>
        </div>
    );
});

// Map Card
const MapCard = memo(({ title, description, counts, note }) => {
    const svgRef = useRef(null);
    const tooltipRef = useRef(null);
    const containerRef = useRef(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    if (!Object.values(counts).some(v => v > 0)) return null;

    return (
        <>
            <div style={{ ...styles.card, gridColumn: '1 / -1' }}>
                {/* Card title row with expand button */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', width: '100%', marginBottom: '6px' }}>
                    <h2 style={{ ...styles.questionTitle, marginBottom: 0, textAlign: 'left', flex: 1 }}>{title}</h2>
                    <button
                        className="map-expand-btn"
                        onClick={() => setIsFullscreen(true)}
                        title="Expand map"
                        style={{
                            marginLeft: '12px',
                            flexShrink: 0,
                            display: 'inline-flex', alignItems: 'center', gap: '5px',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            border: `1.5px solid ${theme.accent}`,
                            backgroundColor: theme.white,
                            color: theme.accent,
                            fontSize: '12px',
                            fontWeight: '600',
                            fontFamily: "'Lato', sans-serif",
                            cursor: 'pointer',
                            transition: 'background-color 0.15s, color 0.15s',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {/* Expand icon (four outward arrows) */}
                        <svg width="13" height="13" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
                            <path d="M1 1h4M1 1v4M13 1h-4M13 1v4M1 13h4M1 13v-4M13 13h-4M13 13v-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Expand
                    </button>
                </div>

                {description && <p style={styles.questionDescription}>{description}</p>}

                <div ref={containerRef} style={{ width: '100%', position: 'relative' }}>
                    <div
                        ref={tooltipRef}
                        style={{
                            display: 'none', position: 'absolute', transform: 'translateX(-50%)',
                            backgroundColor: 'rgba(50,50,50,0.85)', color: '#fff',
                            padding: '5px 10px', borderRadius: '6px', fontSize: '13px',
                            pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 10,
                            fontFamily: "'Lato', sans-serif",
                        }}
                    />
                    <svg ref={svgRef} style={{ width: '100%', display: 'block' }} />
                    <MapRenderer counts={counts} svgRef={svgRef} tooltipRef={tooltipRef} containerRef={containerRef} />
                </div>

                <CountryRankingList counts={counts} />
                {note}
            </div>

            {/* Fullscreen modal portal */}
            {isFullscreen && (
                <MapFullscreenModal
                    title={title}
                    description={description}
                    counts={counts}
                    note={note}
                    onClose={() => setIsFullscreen(false)}
                />
            )}
        </>
    );
});

// Card footnote: responses used, excluded by the quality filter, discarded by normalisation.
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const CardNote = ({ answered, discarded, discardedLabel = 'discarded by normalisation', feedStats }) => {
    const parts = [];
    if (answered != null) parts.push(`Based on ${plural(answered, 'response', 'responses')}`);
    if (feedStats) parts.push(`${plural(feedStats.excluded_quality, 'response', 'responses')} excluded by quality filters (whole survey)`);
    if (discarded != null) parts.push(`${plural(discarded, 'answer', 'answers')} ${discardedLabel}`);
    if (!parts.length) return null;
    return (
        <p title={feedStats?.quality_rule ? `Quality filter: ${feedStats.quality_rule}.` : undefined}
            style={{ width: '100%', margin: '14px 0 0', paddingTop: '10px', borderTop: '1px solid #f0f0f0',
                fontSize: '11.5px', color: theme.textLight, textAlign: 'center', lineHeight: 1.5,
                fontFamily: "'Lato', sans-serif" }}>
            {parts.join(' · ')}
        </p>
    );
};

// Diverging stacked bars for even ordinal scales (PuOr colours, colour-blind safe).
const DIVERGING_COLORS = {
    4: ['#B35806', '#F1A340', '#998EC3', '#542788'],
    6: ['#B35806', '#F1A340', '#FEE0B6', '#D8DAEB', '#998EC3', '#542788'],
};
const DivergingCard = memo(({ title, description, rows, levels, levelLabels = {}, leftLabel, rightLabel, note }) => {
    // width of one half, so a segment only carries its % label when it fits
    const halfRef = useRef(null);
    const [halfPx, setHalfPx] = useState(300);
    useEffect(() => {
        if (!halfRef.current) return undefined;
        const ro = new ResizeObserver(entries => { const w = entries[0]?.contentRect.width; if (w) setHalfPx(w); });
        ro.observe(halfRef.current);
        return () => ro.disconnect();
    }, []);
    if (!rows.length || !rows.some(r => r.n > 0)) return null;
    const half = levels.length / 2;
    const neg = levels.slice(0, half);
    const pos = levels.slice(half);
    const colors = DIVERGING_COLORS[levels.length] || DIVERGING_COLORS[4];
    const pct = (r, l) => (r.n ? (100 * (r.counts[l] || 0)) / r.n : 0);
    const side = (r, ls) => ls.reduce((t, l) => t + pct(r, l), 0);
    // both halves share one scale: the longest side, rounded up to 10%
    const scale = Math.min(100, Math.ceil(Math.max(...rows.map(r => Math.max(side(r, neg), side(r, pos))), 10) / 10) * 10);
    const w = (p) => `${(p / scale) * 100}%`;
    const seg = (r, l, i) => {
        const p = pct(r, l);
        if (!p) return null;
        const dark = i === 0 || i === levels.length - 1;
        return (
            <div key={l} title={`${r.label} · ${levelLabels[l] || l}: ${Math.round(p)}% (${r.counts[l] || 0} of ${r.n})`}
                style={{ width: w(p), background: colors[i], height: '100%', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: '10.5px', fontWeight: 700, color: dark ? '#fff' : '#333',
                    overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {(p / scale) * halfPx >= 30 ? `${Math.round(p)}%` : ''}
            </div>
        );
    };
    const total = { fontSize: '11px', fontWeight: 700, color: theme.textDark, width: '34px', flexShrink: 0 };

    return (
        <div style={{ ...styles.card, gridColumn: '1 / -1' }}>
            <h2 style={styles.questionTitle}>{title}</h2>
            {description && <p style={styles.questionDescription}>{description}</p>}
            <div style={{ width: '100%', maxWidth: '900px' }}>
                <div style={{ display: 'flex', fontSize: '11px', color: theme.textLight, marginBottom: '8px',
                    fontFamily: "'Lato', sans-serif" }}>
                    <span style={{ flex: '0 0 min(34%, 190px)' }} />
                    <span style={{ flex: 1, textAlign: 'right', paddingRight: '10px' }}>← {leftLabel}</span>
                    <span style={{ flex: 1, paddingLeft: '10px' }}>{rightLabel} →</span>
                </div>
                {rows.map((r, ri) => (
                    <div key={r.key} style={{ display: 'flex', alignItems: 'center', marginBottom: '9px', fontFamily: "'Lato', sans-serif" }}>
                        <span style={{ flex: '0 0 min(34%, 190px)', fontSize: '13px', color: theme.textDark, paddingRight: '10px', lineHeight: 1.25 }}>
                            {r.label} <span style={{ color: theme.textLight, fontSize: '11px' }}>n={r.n}</span>
                        </span>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', height: '24px' }}>
                            <span style={{ ...total, textAlign: 'right', paddingRight: '5px' }}>{Math.round(side(r, neg))}%</span>
                            <div ref={ri === 0 ? halfRef : undefined} style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', height: '100%' }}>
                                {neg.map((l, i) => seg(r, l, i))}
                            </div>
                        </div>
                        <div style={{ width: '2px', alignSelf: 'stretch', background: '#555', margin: '-4px 0' }} />
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', height: '24px' }}>
                            <div style={{ flex: 1, display: 'flex', height: '100%' }}>
                                {pos.map((l, i) => seg(r, l, half + i))}
                            </div>
                            <span style={{ ...total, paddingLeft: '5px' }}>{Math.round(side(r, pos))}%</span>
                        </div>
                    </div>
                ))}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', justifyContent: 'center', marginTop: '14px' }}>
                    {levels.map((l, i) => (
                        <span key={l} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11.5px',
                            color: theme.textLight, fontFamily: "'Lato', sans-serif" }}>
                            <span style={{ width: '12px', height: '12px', borderRadius: '2px', background: colors[i] }} />
                            {levelLabels[l] || l}
                        </span>
                    ))}
                </div>
                <p style={{ fontSize: '11px', color: theme.textLight, textAlign: 'center', margin: '8px 0 0', fontFamily: "'Lato', sans-serif" }}>
                    Share of the respondents who rated each item; the centre line falls between {neg[neg.length - 1]} and {pos[0]}.
                    Each half runs to {scale}%.
                </p>
            </div>
            {note}
        </div>
    );
});

// Chart Card
const SINGLES_THRESHOLD = 30;

const capFirst = (s) => {
    const t = String(s ?? '');
    return t ? t.charAt(0).toUpperCase() + t.slice(1) : t;
};

const wrapLabel = (label, max = 24, maxLines = 4) => {
    const words = String(label).split(/\s+/);
    const lines = [];
    let line = '';
    for (const w of words) {
        const candidate = line ? `${line} ${w}` : w;
        if (candidate.length > max && line) { lines.push(line); line = w; } else line = candidate;
    }
    if (line) lines.push(line);
    if (lines.length > maxLines) {
        const kept = lines.slice(0, maxLines);
        kept[maxLines - 1] = `${kept[maxLines - 1].slice(0, max - 1)}…`;
        return kept;
    }
    return lines.length ? lines : [String(label)];
};

const ChartCard = memo(({ title, description, labels, dataValues, type, orientation, otherComments, note }) => {
    const [showOthers, setShowOthers] = useState(false);
    const [showSingles, setShowSingles] = useState(false);

    if (!labels || labels.length === 0) return null;

    labels = labels.map(capFirst);

    const hasTooMany = type === 'bar' && labels.length > SINGLES_THRESHOLD;
    let chartLabels = labels;
    let chartValues = dataValues;
    let singleItems = [];

    if (hasTooMany) {
        chartLabels = [];
        chartValues = [];
        singleItems = [];
        for (let i = 0; i < labels.length; i++) {
            if (dataValues[i] <= 1) {
                singleItems.push(labels[i]);
            } else {
                chartLabels.push(labels[i]);
                chartValues.push(dataValues[i]);
            }
        }
    }

    const isHorizontal =
        orientation === 'horizontal' ||
        (orientation !== 'vertical' && type === 'bar' && chartLabels.some(l => l.length > 20));

    const chartData = {
        labels: chartLabels,
        datasets: [{
            label: 'Responses', data: chartValues,
            backgroundColor: type === 'pie' ? chartPalette : theme.accent,
            borderColor: theme.white, borderWidth: 2,
        }],
    };

    const options = {
        responsive: true, maintainAspectRatio: false,
        indexAxis: isHorizontal ? 'y' : 'x',
        plugins: {
            legend: {
                display: type === 'pie', position: 'bottom',
                labels: { color: theme.textLight, usePointStyle: true, padding: 20, font: { family: "'Lato', sans-serif" } }
            }
        },
        scales: type === 'pie' ? {} : (isHorizontal ? {
            x: { beginAtZero: true, ticks: { precision: 0, font: { family: "'Lato', sans-serif" } } },
            y: {
                grid: { display: false },
                ticks: {
                    autoSkip: false,
                    font: { family: "'Lato', sans-serif", size: 11 },
                    callback: (value, index) => wrapLabel(chartLabels[index]),
                },
            },
        } : {
            y: { beginAtZero: true, ticks: { precision: 0, font: { family: "'Lato', sans-serif" } } },
            x: {
                grid: { display: false },
                ticks: {
                    autoSkip: false, maxRotation: 0, minRotation: 0,
                    font: { family: "'Lato', sans-serif", size: 11 },
                    callback: (value, index) => wrapLabel(chartLabels[index]),
                },
            },
        })
    };

    const maxLabelLines = isHorizontal
        ? chartLabels.reduce((m, l) => Math.max(m, wrapLabel(l).length), 1)
        : 1;
    const rowHeight = Math.max(44, maxLabelLines * 20 + 14);
    const chartHeight = isHorizontal ? Math.max(350, chartLabels.length * rowHeight) : 360;

    return (
        <div style={styles.card}>
            <h2 style={styles.questionTitle}>{title}</h2>
            {description && <p style={styles.questionDescription}>{description}</p>}
            <div style={{ height: `${chartHeight}px`, width: '100%', position: 'relative' }}>
                {type === 'pie' && <Pie data={chartData} options={options} />}
                {type === 'bar' && <Bar data={chartData} options={options} />}
            </div>

            {singleItems.length > 0 && (
                <div style={{ width: '100%', marginTop: '16px', borderTop: '1px solid #eee', paddingTop: '12px' }}>
                    <button
                        onClick={() => setShowSingles(prev => !prev)}
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                            padding: '6px 14px', borderRadius: '8px',
                            border: `1.5px solid ${theme.textLight}`,
                            backgroundColor: showSingles ? theme.textLight : theme.white,
                            color: showSingles ? theme.white : theme.textLight,
                            fontSize: '13px', fontWeight: '600',
                            fontFamily: "'Lato', sans-serif", cursor: 'pointer',
                            transition: 'background-color 0.15s, color 0.15s',
                        }}
                    >
                        {showSingles ? '▲' : '▼'} Others with 1 response ({singleItems.length})
                    </button>

                    {showSingles && (
                        <div style={{
                            marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '6px',
                        }}>
                            {singleItems.map((item, i) => (
                                <span key={i} style={{
                                    backgroundColor: theme.bgLight, borderRadius: '6px',
                                    padding: '4px 10px', fontSize: '12px', color: theme.textDark,
                                    fontFamily: "'Lato', sans-serif", whiteSpace: 'nowrap',
                                }}>
                                    {item}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {otherComments && otherComments.length > 0 && (
                <div style={{ width: '100%', marginTop: '16px', borderTop: '1px solid #eee', paddingTop: '12px' }}>
                    <button
                        onClick={() => setShowOthers(prev => !prev)}
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                            padding: '6px 14px', borderRadius: '8px',
                            border: `1.5px solid ${theme.accent}`,
                            backgroundColor: showOthers ? theme.accent : theme.white,
                            color: showOthers ? theme.white : theme.accent,
                            fontSize: '13px', fontWeight: '600',
                            fontFamily: "'Lato', sans-serif", cursor: 'pointer',
                            transition: 'background-color 0.15s, color 0.15s',
                        }}
                    >
                        {showOthers ? '▲' : '▼'} Other responses ({otherComments.length})
                    </button>

                    {showOthers && (
                        <ul style={{
                            marginTop: '12px', padding: 0, listStyle: 'none',
                            display: 'flex', flexDirection: 'column', gap: '8px',
                        }}>
                            {otherComments.map((comment, i) => (
                                <li key={i} style={{
                                    backgroundColor: theme.bgLight, borderRadius: '8px',
                                    padding: '10px 14px', borderLeft: `3px solid ${theme.accent}`,
                                    fontSize: '13px', color: theme.textDark, lineHeight: '1.5',
                                    fontFamily: "'Lato', sans-serif",
                                }}>
                                    {comment}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
            {note}
        </div>
    );
});

// Main Dashboard
const INGREDIENT_KEYS = new Set(['ingredient_1', 'ingredient_2', 'ingredient_3']);
const DISH_KEYS = new Set(['iconic_dish_1', 'iconic_dish_2', 'iconic_dish_3']);
const REG_DISH_KEYS = new Set(['dish_1', 'dish_2', 'dish_3']);
const DESERT_KEYS = new Set(['desert_island_food']);

export default function SurveyDashboard({ surveyType, pageTitle, pageDescription, surveyLink, charts, categoricalCharts = [], wordCloudCharts = [] }) {
    // Reading telemetry — active only with ?eval=1 (evaluation sessions).
    useEffect(() => initEvalTelemetry(`dashboard_${surveyType}`), [surveyType]);
    const [surveyData, setSurveyData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedRespondent, setSelectedRespondent] = useState(null);
    const [showIndividual, setShowIndividual] = useState(false);
    const [ingredientMapping, setIngredientMapping] = useState(null);
    const [dishMapping, setDishMapping] = useState(null);
    const [regDishMapping, setRegDishMapping] = useState(null);
    const [socialMapping, setSocialMapping] = useState(null);
    const [desertMapping, setDesertMapping] = useState(null);
    const [institutionMapping, setInstitutionMapping] = useState(null);
    const [nationalityMapping, setNationalityMapping] = useState(null);
    const [feedStats, setFeedStats] = useState(null);

    useEffect(() => {
        axios.get(`/api/survey/filtered?surveyType=${surveyType}`)
            .then(response => { setSurveyData(response.data); setLoading(false); })
            .catch(error => { console.error("Erro:", error); setLoading(false); });
        axios.get(`/api/survey/filtered-stats?surveyType=${surveyType}`)
            .then(response => setFeedStats(response.data))
            .catch(() => {});
        fetch('/data/ingredients_normalized.json').then(r => r.json())
            .then(data => setIngredientMapping(data?.mapping || {}))
            .catch(() => {});
        fetch('/data/dishes_normalized.json').then(r => r.json())
            .then(data => setDishMapping(data?.mapping || {}))
            .catch(() => {});
        fetch('/data/regular_dishes_normalized.json').then(r => r.json())
            .then(data => setRegDishMapping(data?.mapping || {}))
            .catch(() => {});
        fetch('/data/social_accounts_normalized.json').then(r => r.json())
            .then(data => setSocialMapping(data?.mapping || {}))
            .catch(() => {});
        fetch('/data/desert_island_normalized.json').then(r => r.json())
            .then(data => setDesertMapping(data?.mapping || {}))
            .catch(() => {});
        fetch('/data/institutions_normalized.json').then(r => r.json())
            .then(data => setInstitutionMapping(data?.mapping || {}))
            .catch(() => {});
        fetch('/data/nationalities_normalized.json').then(r => r.json())
            .then(data => setNationalityMapping(data?.mapping || {}))
            .catch(() => {});
    }, [surveyType]);

    const resolvedCharts = React.useMemo(() => charts ?? [
        ...categoricalCharts.map(c => ({ chartType: 'categorical', ...c })),
        ...wordCloudCharts.map(c => ({ chartType: 'wordcloud', ...c })),
    ], [charts, categoricalCharts, wordCloudCharts]);

    const formattedDates = React.useMemo(
        () => surveyData.map(item => formatDateShort(item.createdAt)),
        [surveyData]
    );

    const processFrequencyData = useCallback((dataKey, numeric = false, forceLabels = null, transform = null) => {
        const isSocial = dataKey === 'list_social_accounts' && socialMapping;
        const isInstitution = dataKey === 'institution' && institutionMapping;
        const normalised = isSocial || isInstitution || !!transform;
        const counts = {};
        let answered = 0, discarded = 0;
        const increment = (raw) => {
            let v = String(raw).trim();
            if (v === '') return;
            if (isSocial) {
                const mapped = socialMapping[v] ?? socialMapping[v.toLowerCase()] ?? socialMapping[v.toLowerCase().replace(/[._\s-]/g, '')];
                if (mapped === null) { discarded++; return; }
                if (typeof mapped === 'string') v = mapped;
            }
            if (isInstitution) {
                const mapped = institutionMapping[v];
                if (mapped === null) { discarded++; return; }
                if (typeof mapped === 'string' && mapped.trim()) v = mapped.trim();
            }
            counts[v] = (counts[v] || 0) + 1;
        };

        surveyData.forEach(item => {
            let value = item[dataKey];
            if (value === null || value === undefined || value === '') return;
            answered++;
            if (numeric) { const num = Number(value); if (!isNaN(num)) counts[String(num)] = (counts[String(num)] || 0) + 1; return; }
            if (transform) {
                const out = transform(value, dataKey === 'nationality' ? nationalityMapping : null);
                if (!out.length) discarded++;
                out.forEach(increment);
                return;
            }
            if (Array.isArray(value)) { value.forEach(increment); return; }
            const str = String(value).trim();
            if (str.startsWith('[')) { try { const p = JSON.parse(str); if (Array.isArray(p)) { p.forEach(increment); return; } } catch (_) { } }
            if (isSocial) { str.split(',').map(p => p.trim()).filter(Boolean).forEach(increment); return; }
            increment(str);
        });

        const meta = { answered, discarded: normalised ? discarded : null };
        if (forceLabels && forceLabels.length > 0) {
            const forcedSet = new Set(forceLabels.map(String));
            const extra = Object.keys(counts).filter(k => !forcedSet.has(k)).sort((a, b) => counts[b] - counts[a]);
            const all = [...forceLabels.map(String), ...extra];
            return { labels: all, dataValues: all.map(l => counts[l] || 0), ...meta };
        }
        if (numeric) {
            const k = Object.keys(counts).sort((a, b) => Number(a) - Number(b));
            return { labels: k, dataValues: k.map(v => counts[v]), ...meta };
        }
        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        return { labels: sorted.map(([k]) => k), dataValues: sorted.map(([, v]) => v), ...meta };
    }, [surveyData, socialMapping, institutionMapping, nationalityMapping]);

    const processMatrixData = useCallback((dataKey, rows, columns) => {
        const counts = {};
        let answered = 0;
        rows.forEach(r => { counts[r.value] = {}; columns.forEach(c => { counts[r.value][c.value] = 0; }); });
        surveyData.forEach(item => {
            let value = item[dataKey];
            if (!value) return;
            if (typeof value === 'string') { try { value = JSON.parse(value); } catch (_) { return; } }
            if (typeof value !== 'object' || Array.isArray(value)) return;
            answered++;
            rows.forEach(r => { const ans = value[r.value]; if (ans && counts[r.value][ans] !== undefined) counts[r.value][ans]++; });
        });
        return {
            answered,
            rowLabels: rows.map(r => r.text), rowValues: rows.map(r => r.value),
            columnLabels: columns.map(c => c.text), columnValues: columns.map(c => c.value), counts,
        };
    }, [surveyData]);

    const processWordCloudData = useCallback((dataKeysArray) => {
        const isIngredient = ingredientMapping && dataKeysArray.some(k => INGREDIENT_KEYS.has(k));
        const isDish = dishMapping && dataKeysArray.some(k => DISH_KEYS.has(k));
        const isRegDish = regDishMapping && dataKeysArray.some(k => REG_DISH_KEYS.has(k));
        const isDesert = desertMapping && dataKeysArray.some(k => DESERT_KEYS.has(k));
        const answered = surveyData.filter(item => dataKeysArray.some(k => typeof item[k] === 'string' && item[k].trim())).length;
        let discarded = 0;
        const top = counts => Object.entries(counts).map(([text, value]) => ({ text, value }))
            .sort((a, b) => b.value - a.value).slice(0, 80);
        if (isIngredient) {
            const counts = {};
            surveyData.forEach(item => {
                dataKeysArray.forEach(key => {
                    const value = item[key];
                    if (!value || typeof value !== 'string' || !value.trim()) return;
                    const raw = value.trim();
                    const mapped = ingredientMapping[raw];
                    if (mapped === null) { discarded++; return; }
                    const normed = Array.isArray(mapped) ? mapped : (raw.length > 1 && raw.length < 30 ? [raw.charAt(0).toUpperCase() + raw.slice(1)] : []);
                    if (!normed.length) discarded++;
                    normed.forEach(n => { counts[n] = (counts[n] || 0) + 1; });
                });
            });
            return { words: top(counts), answered, discarded };
        }
        if (isDish || isRegDish || isDesert) {
            const activeMap = isDish ? dishMapping : isRegDish ? regDishMapping : desertMapping;
            const counts = {};
            surveyData.forEach(item => {
                dataKeysArray.forEach(key => {
                    const value = item[key];
                    if (!value || typeof value !== 'string' || !value.trim()) return;
                    const raw = value.trim();
                    const mapped = activeMap[raw];
                    if (mapped === null) { discarded++; return; }
                    const normed = typeof mapped === 'string' ? mapped : raw;
                    counts[normed] = (counts[normed] || 0) + 1;
                });
            });
            return { words: top(counts), answered, discarded };
        }
        const MAX = 40;
        const raw = {};
        const strip = (str) => str.replace(/[.,;:!?]+$/, '').trim();
        const cap = (str) => str ? str.charAt(0).toUpperCase() + str.slice(1) : str;
        const norm = (str) => {
            let w = str.trim().toLowerCase();
            if (w.length > 4 && w.endsWith('es')) w = w.slice(0, -2);
            else if (w.length > 4 && w.endsWith('s')) w = w.slice(0, -1);
            return w;
        };
        surveyData.forEach(item => {
            dataKeysArray.forEach(key => {
                let value = item[key];
                if (!value || typeof value !== 'string' || !value.trim()) return;
                [strip(value.trim())].filter(Boolean).forEach(part => {
                    if (part.length > MAX) return;
                    const display = cap(part); const normalized = norm(part);
                    if (!normalized) return;
                    if (!raw[normalized]) raw[normalized] = { displayText: display, count: 0 };
                    raw[normalized].count++;
                    if (display.length < raw[normalized].displayText.length) raw[normalized].displayText = display;
                });
            });
        });
        const words = Object.values(raw).map(({ displayText, count }) => ({ text: displayText, value: count }))
            .sort((a, b) => b.value - a.value).slice(0, 80);
        return { words, answered, discarded: null };
    }, [surveyData, ingredientMapping, dishMapping, regDishMapping, desertMapping]);

    const processMapData = useCallback((dataKey) => {
        const counts = {};
        let answered = 0, unmatched = 0;
        surveyData.forEach(item => {
            const raw = item[dataKey];
            if (!raw || typeof raw !== 'string' || !raw.trim()) return;
            answered++;
            const iso3 = normaliseCountry(raw.trim());
            if (iso3) counts[iso3] = (counts[iso3] || 0) + 1;
            else unmatched++;
        });
        return { counts, answered, unmatched };
    }, [surveyData]);

    // Diverging chart: level counts per item, items optionally sorted by mean.
    const processDivergingData = useCallback((items, levels, sort) => {
        const rows = items.map(({ key, label }) => {
            const counts = {};
            let n = 0, sum = 0;
            surveyData.forEach(item => {
                const v = String(item[key] ?? '').trim();
                if (!levels.includes(v)) return;
                counts[v] = (counts[v] || 0) + 1;
                n++;
                sum += Number(v);
            });
            return { key, label, counts, n, mean: n ? sum / n : 0 };
        });
        if (sort === 'mean') rows.sort((a, b) => b.mean - a.mean);
        const answered = surveyData.filter(item => items.some(({ key }) => levels.includes(String(item[key] ?? '').trim()))).length;
        return { rows, answered };
    }, [surveyData]);

    const processOtherComments = useCallback((dataKey) => {
        const commentKey = `${dataKey}-Comment`;
        return surveyData
            .map(item => item[commentKey])
            .filter(v => v && typeof v === 'string' && v.trim() !== '');
    }, [surveyData]);

    const computedCharts = React.useMemo(() => {
        return resolvedCharts.map(chart => {
            if (chart.chartType === 'wordcloud') {
                const { words, answered, discarded } = processWordCloudData(chart.keys);
                return { ...chart, words, meta: { answered, discarded } };
            }
            if (chart.chartType === 'matrix') {
                const matrixData = processMatrixData(chart.key, chart.rows, chart.columns);
                return { ...chart, matrixData, meta: { answered: matrixData.answered } };
            }
            if (chart.chartType === 'map') {
                const { counts, answered, unmatched } = processMapData(chart.key);
                return { ...chart, mapCounts: counts, meta: { answered, discarded: unmatched, discardedLabel: 'not matched to a country' } };
            }
            if (chart.chartType === 'diverging') {
                const { rows, answered } = processDivergingData(chart.items, chart.levels, chart.sort);
                return { ...chart, rows, meta: { answered } };
            }
            const { labels: rawLabels, dataValues, answered, discarded } = processFrequencyData(chart.key, chart.numeric ?? false, chart.forceLabels ?? null, chart.transform ?? null);
            const labels = chart.forceLabelMap ? rawLabels.map(l => chart.forceLabelMap[l] ?? l) : rawLabels;
            const otherComments = processOtherComments(chart.key);
            return { ...chart, labels, dataValues, otherComments, meta: { answered, discarded } };
        });
    }, [resolvedCharts, processFrequencyData, processMatrixData, processWordCloudData, processMapData, processDivergingData, processOtherComments]);

    if (loading) return (
        <div style={{ minHeight: '100vh', padding: '40px', textAlign: 'center', color: theme.textLight, fontFamily: "'Lato', sans-serif" }}>
            Loading dashboard...
        </div>
    );

    return (
        <div style={styles.pageContainer}>
            <div style={styles.contentWrapper}>
                <header style={styles.header}>
                    <img src="/Relish_Logo_Master_01.png" alt="Relish Logo" style={{ height: '60px', marginBottom: '20px' }} />
                    <h1 style={styles.mainTitle}>{pageTitle}</h1>

                    {pageDescription && (
                        <p style={{
                            color: theme.textLight,
                            fontSize: '15px',
                            maxWidth: '600px',
                            margin: '0 auto 12px',
                            lineHeight: '1.6',
                            fontFamily: "'Lato', sans-serif",
                            textAlign: 'justify'
                        }}>
                            {pageDescription}
                        </p>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', flexWrap: 'wrap', marginTop: '8px' }}>
                        <p style={styles.subTitle}>{surveyData.length} responses collected</p>

                        {surveyLink && (
                            <a
                                href={surveyLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                                    padding: '7px 16px', borderRadius: '8px', border: `1.5px solid ${theme.accent}`,
                                    backgroundColor: theme.white, color: theme.accent, fontSize: '13px',
                                    fontWeight: '600', fontFamily: "'Lato', sans-serif", cursor: 'pointer',
                                    transition: 'background-color 0.15s, color 0.15s', whiteSpace: 'nowrap',
                                    textDecoration: 'none'
                                }}
                                onMouseEnter={e => { e.currentTarget.style.backgroundColor = theme.accent; e.currentTarget.style.color = theme.white; }}
                                onMouseLeave={e => { e.currentTarget.style.backgroundColor = theme.white; e.currentTarget.style.color = theme.accent; }}
                            >
                                Take the Survey
                            </a>
                        )}

                        {surveyData.length > 0 && (
                            <button
                                onClick={() => downloadCSV(surveyData, `${surveyType}_survey_data.csv`)}
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                                    padding: '7px 16px', borderRadius: '8px', border: `1.5px solid ${theme.accent}`,
                                    backgroundColor: theme.white, color: theme.accent, fontSize: '13px',
                                    fontWeight: '600', fontFamily: "'Lato', sans-serif", cursor: 'pointer',
                                    transition: 'background-color 0.15s, color 0.15s', whiteSpace: 'nowrap',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.backgroundColor = theme.accent; e.currentTarget.style.color = theme.white; }}
                                onMouseLeave={e => { e.currentTarget.style.backgroundColor = theme.white; e.currentTarget.style.color = theme.accent; }}
                            >
                                ↓ Download CSV
                            </button>
                        )}
                    </div>
                </header>

                <IndividualViewer
                    surveyData={surveyData}
                    selectedRespondent={selectedRespondent}
                    setSelectedRespondent={setSelectedRespondent}
                    showIndividual={showIndividual}
                    setShowIndividual={setShowIndividual}
                    formattedDates={formattedDates}
                />

                <div style={{
                    height: '3px',
                    background: `linear-gradient(to right, transparent, ${theme.accent}, ${theme.accentLight}, ${theme.accent}, transparent)`,
                    borderRadius: '2px', margin: '32px 0', opacity: 0.7,
                }} />

                <div style={styles.grid}>
                    {computedCharts.map((chart, index) => {
                        const note = <CardNote {...chart.meta} feedStats={feedStats} />;
                        if (chart.chartType === 'wordcloud') {
                            return <WordCloudCard key={`wc-${index}`} title={chart.title} description={chart.description} words={chart.words} note={note} />;
                        }
                        if (chart.chartType === 'matrix') {
                            const { rowLabels, rowValues, columnLabels, columnValues, counts } = chart.matrixData;
                            return <MatrixCard key={`mx-${index}`} title={chart.title} description={chart.description}
                                counts={counts} rowLabels={rowLabels} rowValues={rowValues}
                                columnLabels={columnLabels} columnValues={columnValues} note={note} />;
                        }
                        if (chart.chartType === 'map') {
                            return <MapCard key={`map-${index}`} title={chart.title} description={chart.description} counts={chart.mapCounts} note={note} />;
                        }
                        if (chart.chartType === 'diverging') {
                            return <DivergingCard key={`dv-${index}`} title={chart.title} description={chart.description}
                                rows={chart.rows} levels={chart.levels} levelLabels={chart.levelLabels}
                                leftLabel={chart.leftLabel} rightLabel={chart.rightLabel} note={note} />;
                        }
                        return <ChartCard key={`cat-${index}`} title={chart.title} description={chart.description}
                            labels={chart.labels} dataValues={chart.dataValues}
                            type={chart.type} orientation={chart.orientation}
                            otherComments={chart.otherComments} note={note} />;
                    })}
                </div>
            </div>
        </div>
    );
}