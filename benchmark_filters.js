import { performance } from 'node:perf_hooks';

// Setup data
const fileCount = 100000;
const extensions = ['png', 'jpg', 'txt', 'md', 'js', 'html', 'gif', 'svg', 'webp'];
const files = [];
for (let i = 0; i < fileCount; i++) {
    const ext = extensions[i % extensions.length];
    files.push(`file_${i}.${ext}`);
}

// Current implementation
function imagesOnlyCurrent(media) {
    if (!media) return [];
    return media.filter((file) =>
        /\.(png|jpe?g|webp|avif|gif|svg)$/i.test(file),
    );
}

// Optimized implementation
const imageRegex = /\.(png|jpe?g|webp|avif|gif|svg)$/i;
function imagesOnlyOptimized(media) {
    if (!media) return [];
    return media.filter((file) =>
        imageRegex.test(file),
    );
}

// Benchmark
function benchmark(name, fn, iterations) {
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
        fn(files);
    }
    const end = performance.now();
    return end - start;
}

console.log(`Benchmarking with ${fileCount} files...`);

// Warmup
benchmark('Warmup Current', imagesOnlyCurrent, 10);
benchmark('Warmup Optimized', imagesOnlyOptimized, 10);

// Run
const iterations = 500;
const timeCurrent = benchmark('Current', imagesOnlyCurrent, iterations);
const timeOptimized = benchmark('Optimized', imagesOnlyOptimized, iterations);

console.log(`Current: ${timeCurrent.toFixed(2)}ms`);
console.log(`Optimized: ${timeOptimized.toFixed(2)}ms`);
console.log(`Improvement: ${((timeCurrent - timeOptimized) / timeCurrent * 100).toFixed(2)}%`);
