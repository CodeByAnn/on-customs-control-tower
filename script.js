const pageOptions = new URLSearchParams(window.location.search);
if (pageOptions.get("bg") === "classic") {
    document.body.classList.add("classic-bg");
}

const sourceData = {
    regions: [
        { region: "Americas", sales: 450.7, reportedGrowth: 3.1, ccGrowth: 17.1, color: "#b9e8f5" },
        { region: "EMEA", sales: 207.1, reportedGrowth: 22.8, ccGrowth: 25.6, color: "#bfefd0" },
        { region: "APAC", sales: 174.0, reportedGrowth: 44.4, ccGrowth: 61.4, color: "#c9f36a" }
    ],
    products: [
        { category: "Shoes", sales: 763.7, growth: 12.2, color: "#b9e8f5" },
        { category: "Apparel", sales: 55.3, growth: 45.1, color: "#bfefd0" },
        { category: "Accessories", sales: 12.9, growth: 70.7, color: "#e8a15a" }
    ],
    channels: [
        { channel: "Direct-to-consumer", sales: 322.3, growth: 16.4 },
        { channel: "Wholesale", sales: 509.6, growth: 13.3 }
    ],
    tariff: {
        amount: 55,
        label: "IEEPA tariffs paid",
        date: "March 31, 2026",
        uncertainty: "Refund timing and amount uncertain"
    }
};

// Simulated customs layer for portfolio demonstration.
const simulatedOps = {
    clearance: [
        { label: "Auto-cleared", value: 68, color: "#bfefd0" },
        { label: "Manual review", value: 22, color: "#b9e8f5" },
        { label: "Escalated", value: 10, color: "#e98ba7" }
    ],
    exceptions: [
        { reason: "Missing country of origin", count: 34, color: "#e8a15a" },
        { reason: "Low HS confidence", count: 28, color: "#e98ba7" },
        { reason: "Invoice value mismatch", count: 21, color: "#b9e8f5" },
        { reason: "Material data missing", count: 18, color: "#bfefd0" },
        { reason: "Refund candidate", count: 13, color: "#c9f36a" }
    ],
    exposureByRegion: [
        { region: "Americas", exposure: 34, color: "#b9e8f5" },
        { region: "EMEA", exposure: 11, color: "#bfefd0" },
        { region: "APAC", exposure: 10, color: "#e98ba7" }
    ],
    docQuality: 84
};

const tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("position", "fixed")
    .style("z-index", "20")
    .style("pointer-events", "none")
    .style("opacity", "0")
    .style("max-width", "280px")
    .style("padding", "11px 12px")
    .style("border", "1px solid rgba(28,28,28,0.14)")
    .style("border-radius", "8px")
    .style("background", "rgba(255,255,255,0.96)")
    .style("box-shadow", "0 18px 50px rgba(28,28,28,0.16)")
    .style("color", "#1c1c1c")
    .style("font", "800 13px/1.45 Inter, system-ui, sans-serif");

function showTip(event, html) {
    tooltip.html(html)
        .style("left", `${Math.min(window.innerWidth - 310, event.clientX + 16)}px`)
        .style("top", `${event.clientY + 16}px`)
        .transition()
        .duration(120)
        .style("opacity", "1");
}

function hideTip() {
    tooltip.transition().duration(120).style("opacity", "0");
}

function moneyChf(value) {
    return `CHF ${d3.format(",.1f")(value)}M`;
}

function chartBase(selector, options = {}) {
    const container = d3.select(selector);
    container.selectAll("*").remove();

    const width = Math.max(320, container.node().clientWidth);
    const height = width < 640 ? (options.mobileHeight || 380) : (options.height || 460);
    const margin = width < 640
        ? (options.mobileMargin || { top: 34, right: 20, bottom: 58, left: 74 })
        : (options.margin || { top: 40, right: 36, bottom: 66, left: 92 });

    const svg = container.append("svg").attr("viewBox", `0 0 ${width} ${height}`);
    const g = svg.append("g").attr("transform", `translate(${margin.left}, ${margin.top})`);

    return {
        container,
        svg,
        g,
        width,
        height,
        margin,
        innerWidth: width - margin.left - margin.right,
        innerHeight: height - margin.top - margin.bottom
    };
}

function renderNetwork() {
    const { svg, width, height } = chartBase("#network-visual", {
        height: 360,
        mobileHeight: 280,
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
        mobileMargin: { top: 0, right: 0, bottom: 0, left: 0 }
    });

    const nodes = [
        { id: "regions", label: "Regions", sublabel: "(Trade lanes)", x: 0.13, y: 0.24, color: "#6bbfd3", labelY: 54 },
        { id: "products", label: "Products", sublabel: "(Master data)", x: 0.18, y: 0.76, color: "#7ccf98", labelY: 54 },
        { id: "docs", label: "Shipment documents", sublabel: "(eg. Invoice & packing list)", x: width < 420 ? 0.72 : 0.78, y: 0.18, color: "#e8a15a", labelY: width < 420 ? -42 : -70 },
        { id: "rules", label: "Rules", sublabel: "(Tariff logic)", x: 0.86, y: 0.72, color: "#e98ba7", labelY: 54 },
        { id: "tower", label: "Control tower", x: 0.56, y: 0.51, color: "#1c1c1c", core: true, labelY: 74 }
    ].map(d => ({ ...d, x: d.x * width, y: d.y * height }));

    const links = [
        ["regions", "tower", "#6bbfd3"],
        ["products", "tower", "#7ccf98"],
        ["docs", "tower", "#e8a15a"],
        ["rules", "tower", "#e98ba7"]
    ].map(([source, target, color]) => ({
        source: nodes.find(d => d.id === source),
        target: nodes.find(d => d.id === target),
        color
    }));

    svg.append("defs")
        .append("filter")
        .attr("id", "glow")
        .append("feGaussianBlur")
        .attr("stdDeviation", 4)
        .attr("result", "coloredBlur");

    svg.select("defs")
        .append("linearGradient")
        .attr("id", "linkGradient")
        .attr("x1", "0%")
        .attr("x2", "100%")
        .selectAll("stop")
        .data([
            { offset: "0%", color: "#6bbfd3" },
            { offset: "100%", color: "#7ccf98" }
        ])
        .join("stop")
        .attr("offset", d => d.offset)
        .attr("stop-color", d => d.color);

    const linkGroup = svg.append("g")
        .attr("class", "network-links");

    linkGroup
        .selectAll("path")
        .data(links)
        .join("path")
        .attr("id", (d, i) => `network-path-${i}`)
        .attr("d", d => {
            const mx = (d.source.x + d.target.x) / 2;
            const bend = d.source.y < d.target.y ? -24 : 24;
            return `M${d.source.x},${d.source.y} C${mx},${d.source.y + bend} ${mx},${d.target.y - bend} ${d.target.x},${d.target.y}`;
        })
        .attr("fill", "none")
        .attr("stroke", "url(#linkGradient)")
        .attr("stroke-width", 2)
        .attr("stroke-opacity", 0.28);

    const packetGroup = svg.append("g").attr("class", "network-packets");

    links.forEach((link, index) => {
        [0, 1].forEach(offset => {
            const packet = packetGroup.append("circle")
                .attr("r", offset === 0 ? 4.8 : 3.4)
                .attr("fill", link.color)
                .attr("opacity", offset === 0 ? 0.88 : 0.52);

            packet.append("animateMotion")
                .attr("dur", `${3.6 + index * 0.35}s`)
                .attr("begin", `${offset * 1.4 + index * 0.25}s`)
                .attr("repeatCount", "indefinite")
                .attr("rotate", "auto")
                .append("mpath")
                .attr("href", `#network-path-${index}`)
                .attr("xlink:href", `#network-path-${index}`);
        });
    });

    const node = svg.append("g")
        .attr("class", "network-nodes")
        .selectAll("g")
        .data(nodes)
        .join("g")
        .attr("transform", d => `translate(${d.x},${d.y})`);

    node.append("circle")
        .attr("r", d => d.core ? 50 : 32)
        .attr("fill", d => d.core ? "rgba(28,28,28,0.045)" : `${d.color}42`)
        .attr("stroke", d => d.color)
        .attr("stroke-width", d => d.core ? 2.4 : 1.6);

    node.append("circle")
        .attr("r", d => d.core ? 11 : 7)
        .attr("fill", d => d.color)
        .attr("opacity", 0.95);

    const nodeLabel = node.filter(d => !d.core)
        .append("text")
        .attr("y", d => d.labelY)
        .attr("text-anchor", "middle")
        .attr("fill", "#1c1c1c")
        .attr("font-size", 13)
        .attr("font-weight", 950)
        .text(d => d.label);

    nodeLabel.each(function(d) {
        const text = d3.select(this);
        (d.sublabelLines || [d.sublabel]).forEach((line, index) => {
            text.append("tspan")
                .attr("x", 0)
                .attr("dy", index === 0 ? 15 : 12)
                .attr("fill", "#5e625c")
                .attr("font-size", d.id === "docs" ? 8.6 : 10)
                .attr("font-weight", 850)
                .text(line);
        });
    });

    const tower = nodes.find(d => d.id === "tower");
    const compactNetwork = width < 420;
    const labelOffset = compactNetwork ? 58 : 68;
    const towerLabelSize = compactNetwork ? 15 : 22;

    svg.append("text")
        .attr("class", "tower-split-label")
        .attr("x", tower.x)
        .attr("y", tower.y - labelOffset + 8)
        .attr("text-anchor", "middle")
        .attr("fill", "#1c1c1c")
        .attr("font-size", towerLabelSize)
        .attr("font-weight", 950)
        .attr("letter-spacing", "0.02em")
        .text("CONTROL");

    svg.append("text")
        .attr("class", "tower-split-label")
        .attr("x", tower.x)
        .attr("y", tower.y + labelOffset + 8)
        .attr("text-anchor", "middle")
        .attr("fill", "#1c1c1c")
        .attr("font-size", towerLabelSize)
        .attr("font-weight", 950)
        .attr("letter-spacing", "0.02em")
        .text("TOWER");

    const pulse = svg.append("circle")
        .attr("cx", tower.x)
        .attr("cy", tower.y)
        .attr("r", 18)
        .attr("fill", "none")
        .attr("stroke", "#c9f36a")
        .attr("stroke-width", 2)
        .attr("opacity", 0.8);

    function animatePulse() {
        pulse.attr("r", 18).attr("opacity", 0.8)
            .transition()
            .duration(1800)
            .ease(d3.easeCubicOut)
            .attr("r", 84)
            .attr("opacity", 0)
            .on("end", animatePulse);
    }

    animatePulse();

    const orbit = svg.append("g")
        .attr("transform", `translate(${tower.x},${tower.y})`);
    const orbitSpin = orbit.append("g");

    orbitSpin.append("circle")
        .attr("r", 68)
        .attr("fill", "none")
        .attr("stroke", "rgba(28,28,28,0.08)")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "4 8");

    orbitSpin.selectAll(".orbit-dot")
        .data([
            { angle: 0, color: "#6bbfd3" },
            { angle: 120, color: "#c9f36a" },
            { angle: 240, color: "#e98ba7" }
        ])
        .join("circle")
        .attr("class", "orbit-dot")
        .attr("r", 5)
        .attr("cx", d => Math.cos(d.angle * Math.PI / 180) * 68)
        .attr("cy", d => Math.sin(d.angle * Math.PI / 180) * 68)
        .attr("fill", d => d.color);

    orbitSpin.append("animateTransform")
        .attr("attributeName", "transform")
        .attr("type", "rotate")
        .attr("from", "0 0 0")
        .attr("to", "360 0 0")
        .attr("dur", "18s")
        .attr("repeatCount", "indefinite");
}

function renderRegionalChart() {
    const { svg, g, innerWidth, innerHeight, margin, width, height } = chartBase("#regional-chart");
    const railWidth = width < 640 ? 112 : 170;
    const barWidth = innerWidth - railWidth;
    const x = d3.scaleLinear().domain([0, 500]).range([0, barWidth]);
    const y = d3.scaleBand().domain(sourceData.regions.map(d => d.region)).range([0, innerHeight]).padding(0.34);
    const growthColumnX = innerWidth - (width < 640 ? 38 : 94);
    const labelX = width < 640 ? growthColumnX : growthColumnX + 26;

    g.append("g")
        .attr("class", "grid")
        .call(d3.axisTop(x).ticks(4).tickSize(-innerHeight).tickFormat(""));

    g.append("g")
        .attr("class", "axis")
        .call(d3.axisLeft(y).tickSize(0));

    g.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x).ticks(4).tickFormat(d => `${d}`));

    const rows = g.selectAll(".region-row")
        .data(sourceData.regions)
        .join("g")
        .attr("class", "region-row")
        .attr("transform", d => `translate(0,${y(d.region)})`);

    rows.append("rect")
        .attr("height", y.bandwidth())
        .attr("rx", 8)
        .attr("fill", d => d.color)
        .attr("opacity", 0.24)
        .attr("width", 0)
        .transition()
        .duration(900)
        .attr("width", d => x(d.sales));

    rows.append("rect")
        .attr("height", y.bandwidth())
        .attr("rx", 8)
        .attr("fill", d => d.color)
        .attr("opacity", 0.78)
        .attr("width", 0)
        .transition()
        .duration(900)
        .attr("width", d => x(d.sales) * 0.22);

    rows.append("text")
        .attr("x", d => Math.min(x(d.sales) + 10, barWidth - 78))
        .attr("y", y.bandwidth() / 2)
        .attr("dominant-baseline", "middle")
        .attr("fill", "#1c1c1c")
        .attr("font-size", width < 640 ? 13 : 15)
        .attr("font-weight", 950)
        .text(d => moneyChf(d.sales));

    rows.append("circle")
        .attr("class", "growth-pulse")
        .attr("cx", growthColumnX)
        .attr("cy", y.bandwidth() / 2)
        .attr("r", 0)
        .attr("fill", "none")
        .attr("stroke", d => d.color)
        .attr("stroke-width", 1.4)
        .attr("opacity", 0.55)
        .transition()
        .delay(250)
        .duration(900)
        .attr("r", d => 22 + d.ccGrowth / 5.4)
        .attr("opacity", 0.2);

    rows.append("circle")
        .attr("cx", growthColumnX)
        .attr("cy", y.bandwidth() / 2)
        .attr("r", 0)
        .attr("fill", d => d.color)
        .attr("stroke", "#ffffff")
        .attr("stroke-width", 1.8)
        .style("cursor", "pointer")
        .on("mousemove", (event, d) => {
            showTip(event, `<strong>${d.region}</strong><br>${moneyChf(d.sales)} net sales<br>+${d.reportedGrowth}% reported growth<br>+${d.ccGrowth}% constant currency growth`);
        })
        .on("mouseleave", hideTip)
        .transition()
        .delay(250)
        .duration(750)
        .attr("r", d => 12 + d.ccGrowth / 6.4);

    rows.append("text")
        .attr("x", growthColumnX)
        .attr("y", y.bandwidth() / 2 + 4)
        .attr("text-anchor", "middle")
        .attr("fill", "#1c1c1c")
        .attr("font-size", 12)
        .attr("font-weight", 950)
        .text(d => `${Math.round(d.ccGrowth)}`);

    rows.append("text")
        .attr("x", labelX)
        .attr("y", width < 640 ? y.bandwidth() / 2 + 30 : y.bandwidth() / 2 + 4)
        .attr("text-anchor", width < 640 ? "middle" : "start")
        .attr("dominant-baseline", "middle")
        .attr("fill", "#1c1c1c")
        .attr("font-size", width < 640 ? 9 : 12)
        .attr("font-weight", 900)
        .text(d => width < 640 ? `+${Math.round(d.ccGrowth)}% CC` : `+${Math.round(d.ccGrowth)}% CC growth`);

    svg.append("text")
        .attr("class", "axis-label")
        .attr("x", margin.left)
        .attr("y", height - 12)
        .text("Net sales, mCHF");

}

function renderProductChart() {
    const { svg, g, innerWidth, innerHeight, margin, width, height } = chartBase("#product-chart");
    const railWidth = width < 640 ? 110 : 164;
    const barWidth = innerWidth - railWidth;
    const x = d3.scaleLinear().domain([0, 820]).range([0, barWidth]);
    const y = d3.scaleBand().domain(sourceData.products.map(d => d.category)).range([0, innerHeight]).padding(0.36);
    const growthColumnX = innerWidth - (width < 640 ? 44 : 92);

    g.append("g")
        .attr("class", "grid")
        .call(d3.axisTop(x).ticks(4).tickSize(-innerHeight).tickFormat(""));

    g.append("g")
        .attr("class", "axis")
        .call(d3.axisLeft(y).tickSize(0));

    g.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x).ticks(4).tickFormat(d => `${d}`));

    const rows = g.selectAll(".product-row")
        .data(sourceData.products)
        .join("g")
        .attr("class", "product-row")
        .attr("transform", d => `translate(0,${y(d.category)})`);

    rows.append("rect")
        .attr("height", y.bandwidth())
        .attr("rx", 8)
        .attr("fill", d => d.color)
        .attr("opacity", 0.18)
        .attr("width", d => x(d.sales));

    rows.append("rect")
        .attr("height", y.bandwidth())
        .attr("rx", 8)
        .attr("fill", d => d.color)
        .attr("width", 0)
        .transition()
        .duration(900)
        .attr("width", d => Math.max(12, x(d.sales)));

    rows.append("text")
        .attr("x", d => d.sales > 150 ? 16 : x(d.sales) + 12)
        .attr("y", y.bandwidth() / 2)
        .attr("dominant-baseline", "middle")
        .attr("fill", "#1c1c1c")
        .attr("font-size", width < 640 ? 13 : 15)
        .attr("font-weight", 950)
        .text(d => moneyChf(d.sales));

    rows.append("circle")
        .attr("class", "growth-pulse")
        .attr("cx", growthColumnX)
        .attr("cy", y.bandwidth() / 2)
        .attr("r", 0)
        .attr("fill", "none")
        .attr("stroke", d => d.color)
        .attr("stroke-width", 1.4)
        .attr("opacity", 0.55)
        .transition()
        .delay(260)
        .duration(900)
        .attr("r", d => 22 + d.growth / 6)
        .attr("opacity", 0.2);

    rows.append("circle")
        .attr("cx", growthColumnX)
        .attr("cy", y.bandwidth() / 2)
        .attr("r", 0)
        .attr("fill", d => d.color)
        .attr("stroke", "#ffffff")
        .attr("stroke-width", 1.8)
        .style("cursor", "pointer")
        .on("mousemove", (event, d) => {
            showTip(event, `<strong>${d.category}</strong><br>${moneyChf(d.sales)} sales<br>+${d.growth}% growth`);
        })
        .on("mouseleave", hideTip)
        .transition()
        .delay(260)
        .duration(760)
        .attr("r", d => 12 + d.growth / 6.6);

    rows.append("text")
        .attr("x", growthColumnX)
        .attr("y", y.bandwidth() / 2 + 5)
        .attr("text-anchor", "middle")
        .attr("fill", "#1c1c1c")
        .attr("font-size", 12)
        .attr("font-weight", 950)
        .text(d => `+${Math.round(d.growth)}`);

    svg.append("text")
        .attr("class", "axis-label")
        .attr("x", margin.left)
        .attr("y", height - 12)
        .text("Category sales, mCHF");

}

function renderTariffChart() {
    const { svg, width, height } = chartBase("#tariff-chart", {
        height: 310,
        mobileHeight: 390,
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
        mobileMargin: { top: 0, right: 0, bottom: 0, left: 0 }
    });

    const cx = width < 640 ? width * 0.5 : width * 0.36;
    const cy = height * (width < 640 ? 0.32 : 0.39);
    const r = Math.min(width, height) * (width < 640 ? 0.27 : 0.37);

    const bubble = svg.append("g")
        .attr("class", "tariff-bubble")
        .attr("transform-origin", `${cx}px ${cy}px`);

    bubble.append("circle")
        .attr("cx", cx)
        .attr("cy", cy)
        .attr("r", 6)
        .attr("fill", "rgba(233, 139, 167, 0.16)")
        .attr("stroke", "#e98ba7")
        .attr("stroke-width", 2.2)
        .transition()
        .duration(950)
        .ease(d3.easeBackOut.overshoot(1.45))
        .attr("r", r);

    bubble.append("circle")
        .attr("cx", cx)
        .attr("cy", cy)
        .attr("r", 2)
        .attr("fill", "rgba(255,255,255,0.42)")
        .attr("stroke", "rgba(233, 139, 167, 0.38)")
        .attr("stroke-width", 1.2)
        .attr("stroke-dasharray", "5 8")
        .transition()
        .delay(160)
        .duration(950)
        .ease(d3.easeBackOut.overshoot(1.2))
        .attr("r", r * 0.72);

    const pulse = bubble.append("circle")
        .attr("cx", cx)
        .attr("cy", cy)
        .attr("r", r * 0.82)
        .attr("fill", "none")
        .attr("stroke", "rgba(233, 139, 167, 0.34)")
        .attr("stroke-width", 2);

    pulse.append("animate")
        .attr("attributeName", "r")
        .attr("values", `${r * 0.82};${r * 1.1};${r * 0.82}`)
        .attr("dur", "3.2s")
        .attr("repeatCount", "indefinite");

    pulse.append("animate")
        .attr("attributeName", "opacity")
        .attr("values", "0.55;0;0.55")
        .attr("dur", "3.2s")
        .attr("repeatCount", "indefinite");

    bubble.append("circle")
        .attr("cx", cx - r * 0.28)
        .attr("cy", cy - r * 0.2)
        .attr("r", r * 0.48)
        .attr("fill", "rgba(255,255,255,0.14)")
        .attr("opacity", 0.75)
        .append("animate")
        .attr("attributeName", "opacity")
        .attr("values", "0.45;0.78;0.45")
        .attr("dur", "4.2s")
        .attr("repeatCount", "indefinite");

    const meshNodes = [
        { id: "paid", x: -0.38, y: -0.08, radius: 0.068, color: "#e98ba7" },
        { id: "docs", x: -0.14, y: -0.36, radius: 0.048, color: "#b9e8f5" },
        { id: "rules", x: 0.3, y: -0.18, radius: 0.058, color: "#bfefd0" },
        { id: "refund", x: 0.25, y: 0.24, radius: 0.052, color: "#e8a15a" },
        { id: "core", x: -0.04, y: 0.08, radius: 0.034, color: "#1c1c1c" }
    ];
    const meshLinks = [
        ["paid", "docs"],
        ["docs", "rules"],
        ["rules", "refund"],
        ["refund", "paid"],
        ["core", "paid"],
        ["core", "rules"],
        ["core", "refund"]
    ].map(([source, target]) => ({
        source: meshNodes.find(d => d.id === source),
        target: meshNodes.find(d => d.id === target)
    }));

    const mesh = bubble.append("g")
        .attr("class", "tariff-mesh")
        .attr("opacity", 0);

    mesh.selectAll("line")
        .data(meshLinks)
        .join("line")
        .attr("x1", d => cx + d.source.x * r)
        .attr("y1", d => cy + d.source.y * r)
        .attr("x2", d => cx + d.target.x * r)
        .attr("y2", d => cy + d.target.y * r)
        .attr("stroke", "rgba(255,255,255,0.58)")
        .attr("stroke-width", 1.25)
        .attr("stroke-linecap", "round");

    mesh.selectAll(".mesh-orb")
        .data(meshNodes)
        .join("circle")
        .attr("class", "mesh-orb")
        .attr("cx", d => cx + d.x * r)
        .attr("cy", d => cy + d.y * r)
        .attr("r", 0)
        .attr("fill", d => d.color)
        .attr("fill-opacity", d => d.id === "core" ? 0.68 : 0.42)
        .attr("stroke", "rgba(255,255,255,0.72)")
        .attr("stroke-width", 1.2)
        .transition()
        .delay((d, i) => 520 + i * 90)
        .duration(680)
        .ease(d3.easeBackOut.overshoot(1.2))
        .attr("r", d => r * d.radius);

    mesh.selectAll(".mesh-ring")
        .data(meshNodes.filter(d => d.id !== "core"))
        .join("circle")
        .attr("class", "mesh-ring")
        .attr("cx", d => cx + d.x * r)
        .attr("cy", d => cy + d.y * r)
        .attr("r", d => r * d.radius * 1.6)
        .attr("fill", "none")
        .attr("stroke", d => d.color)
        .attr("stroke-width", 1)
        .attr("stroke-opacity", 0.34)
        .attr("stroke-dasharray", "3 6");

    mesh.append("animateTransform")
        .attr("attributeName", "transform")
        .attr("type", "rotate")
        .attr("values", `-2 ${cx} ${cy};2 ${cx} ${cy};-2 ${cx} ${cy}`)
        .attr("dur", "8.5s")
        .attr("repeatCount", "indefinite");

    mesh.transition()
        .delay(480)
        .duration(520)
        .attr("opacity", 0.78);

    svg.append("text")
        .attr("x", cx)
        .attr("y", cy - 6)
        .attr("text-anchor", "middle")
        .attr("fill", "#8a314d")
        .attr("font-size", width < 640 ? 38 : 52)
        .attr("font-weight", 950)
        .attr("letter-spacing", "-0.058em")
        .attr("opacity", 0)
        .text("CHF 55M");

    svg.append("text")
        .attr("x", cx)
        .attr("y", cy + 34)
        .attr("text-anchor", "middle")
        .attr("fill", "#1c1c1c")
        .attr("font-size", width < 640 ? 11 : 13)
        .attr("font-weight", 950)
        .attr("letter-spacing", "0.14em")
        .attr("opacity", 0)
        .text("IEEPA TARIFFS PAID");

    svg.selectAll(".tariff-bubble + text, .tariff-bubble + text + text")
        .transition()
        .delay(420)
        .duration(500)
        .attr("opacity", 1);

    const cash = svg.append("g")
        .attr("class", "cash-paid-signal")
        .attr("transform", `translate(${width < 640 ? cx - 52 : cx + r * 1.18}, ${width < 640 ? cy + r * 0.96 : cy - 4})`);

    cash.append("circle")
        .attr("cx", 0)
        .attr("cy", 0)
        .attr("r", 7)
        .attr("fill", "#e98ba7")
        .append("animate")
        .attr("attributeName", "opacity")
        .attr("values", "0.45;1;0.45")
        .attr("dur", "1.8s")
        .attr("repeatCount", "indefinite");

    const cashText = cash.append("text")
        .attr("x", 18)
        .attr("y", 7)
        .attr("fill", "#1c1c1c")
        .attr("font-size", width < 640 ? 17 : 23)
        .attr("font-weight", 950)
        .attr("letter-spacing", "-0.035em")
        .text("Cash paid");

    cashText.append("animate")
        .attr("attributeName", "opacity")
        .attr("values", "0.65;1;0.65")
        .attr("dur", "1.8s")
        .attr("repeatCount", "indefinite");

    const process = [
        { label: "Paid", color: "#e98ba7" },
        { label: "Refund opened", color: "#b9e8f5" },
        { label: "Recovery uncertain", color: "#e8a15a" }
    ];
    const flowY = width < 640 ? height * 0.76 : height * 0.78;
    const flowStart = width < 640 ? width * 0.14 : width * 0.16;
    const flowEnd = width < 640 ? width * 0.86 : width * 0.84;
    const flowScale = d3.scalePoint().domain(process.map(d => d.label)).range([flowStart, flowEnd]);

    svg.append("line")
        .attr("x1", flowStart)
        .attr("x2", flowEnd)
        .attr("y1", flowY)
        .attr("y2", flowY)
        .attr("stroke", "rgba(28,28,28,0.13)")
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "4 8");

    svg.append("circle")
        .attr("r", 4.5)
        .attr("fill", "#1c1c1c")
        .attr("opacity", 0.62)
        .append("animateMotion")
        .attr("dur", "4.4s")
        .attr("repeatCount", "indefinite")
        .attr("path", `M${flowStart},${flowY} L${flowEnd},${flowY}`);

    const step = svg.append("g")
        .selectAll("g")
        .data(process)
        .join("g")
        .attr("transform", d => `translate(${flowScale(d.label)},${flowY})`);

    step.append("circle")
        .attr("r", width < 640 ? 9 : 11)
        .attr("fill", d => d.color)
        .attr("stroke", "#ffffff")
        .attr("stroke-width", 1.4);

    step.append("text")
        .attr("y", width < 640 ? 28 : 32)
        .attr("text-anchor", "middle")
        .attr("fill", "#1c1c1c")
        .attr("font-size", width < 640 ? 10 : 12)
        .attr("font-weight", 950)
        .text(d => d.label);
}

function renderClearanceChart() {
    const { svg, g, innerWidth, innerHeight } = chartBase("#clearance-chart", {
        height: 130,
        mobileHeight: 130,
        margin: { top: 26, right: 6, bottom: 24, left: 6 },
        mobileMargin: { top: 26, right: 6, bottom: 24, left: 6 }
    });

    const total = d3.sum(simulatedOps.clearance, d => d.value);
    const x = d3.scaleLinear().domain([0, total]).range([0, innerWidth]);
    const compactLabels = innerWidth < 360;
    let cursor = 0;

    g.selectAll("rect")
        .data(simulatedOps.clearance)
        .join("rect")
        .attr("x", d => {
            const x0 = x(cursor);
            cursor += d.value;
            return x0;
        })
        .attr("y", 22)
        .attr("height", 28)
        .attr("width", d => x(d.value))
        .attr("rx", 8)
        .attr("fill", d => d.color)
        .attr("opacity", 0.9)
        .on("mousemove", (event, d) => showTip(event, `<strong>${d.label}</strong><br>${d.value}% share`))
        .on("mouseleave", hideTip);

    let labelCursor = 0;
    g.selectAll("text")
        .data(simulatedOps.clearance)
        .join("text")
        .attr("x", d => {
            const x0 = x(labelCursor) + x(d.value) / 2;
            labelCursor += d.value;
            return x0;
        })
        .attr("y", (d, i) => compactLabels && i === 2 ? 89 : 73)
        .attr("text-anchor", "middle")
        .attr("fill", "#6f706b")
        .attr("font-size", compactLabels ? 9 : 12)
        .attr("font-weight", 950)
        .text(d => compactLabels && d.label === "Manual review" ? "Review" : d.label);
}

function renderExceptionsChart() {
    const { g, innerWidth, innerHeight } = chartBase("#exceptions-chart", {
        height: 250,
        mobileHeight: 250,
        margin: { top: 16, right: 16, bottom: 28, left: 156 },
        mobileMargin: { top: 16, right: 10, bottom: 28, left: 138 }
    });

    const x = d3.scaleLinear().domain([0, 36]).range([0, innerWidth]);
    const y = d3.scaleBand().domain(simulatedOps.exceptions.map(d => d.reason)).range([0, innerHeight]).padding(0.26);

    g.append("g").attr("class", "axis").call(d3.axisLeft(y).tickSize(0));
    g.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x).ticks(4));

    const rows = g.selectAll("rect")
        .data(simulatedOps.exceptions)
        .join("rect")
        .attr("y", d => y(d.reason))
        .attr("height", y.bandwidth())
        .attr("rx", 7)
        .attr("fill", d => d.color)
        .attr("width", 0)
        .on("mousemove", (event, d) => showTip(event, `<strong>${d.reason}</strong><br>${d.count} shipments`))
        .on("mouseleave", hideTip);

    rows.transition().duration(800).attr("width", d => x(d.count));
}

function renderExposureChart() {
    const { g, innerWidth, innerHeight } = chartBase("#exposure-chart", {
        height: 250,
        mobileHeight: 250,
        margin: { top: 16, right: 18, bottom: 28, left: 82 },
        mobileMargin: { top: 16, right: 14, bottom: 28, left: 82 }
    });

    const x = d3.scaleLinear().domain([0, 38]).range([0, innerWidth]);
    const y = d3.scaleBand().domain(simulatedOps.exposureByRegion.map(d => d.region)).range([0, innerHeight]).padding(0.34);

    g.append("g").attr("class", "axis").call(d3.axisLeft(y).tickSize(0));
    g.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x).ticks(4).tickFormat(d => `${d}`));

    g.selectAll("rect")
        .data(simulatedOps.exposureByRegion)
        .join("rect")
        .attr("y", d => y(d.region))
        .attr("height", y.bandwidth())
        .attr("rx", 8)
        .attr("fill", d => d.color)
        .attr("width", 0)
        .on("mousemove", (event, d) => showTip(event, `<strong>${d.region}</strong><br>CHF ${d.exposure}M tariff exposure`))
        .on("mouseleave", hideTip)
        .transition()
        .duration(850)
        .attr("width", d => x(d.exposure));

    g.selectAll(".label")
        .data(simulatedOps.exposureByRegion)
        .join("text")
        .attr("class", "label")
        .attr("x", d => x(d.exposure) + 8)
        .attr("y", d => y(d.region) + y.bandwidth() / 2)
        .attr("dominant-baseline", "middle")
        .attr("fill", "#1c1c1c")
        .attr("font-size", 12)
        .attr("font-weight", 950)
        .text(d => `CHF ${d.exposure}M`);
}

function renderQualityGauge() {
    const { svg, width, height } = chartBase("#quality-chart", {
        height: 140,
        mobileHeight: 140,
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
        mobileMargin: { top: 0, right: 0, bottom: 0, left: 0 }
    });

    const cx = width / 2;
    const cy = height * 0.86;
    const r = Math.min(width * 0.34, 86);
    const arc = d3.arc().innerRadius(r - 14).outerRadius(r).startAngle(-Math.PI / 2);

    svg.append("path")
        .attr("d", arc({ endAngle: Math.PI / 2 }))
        .attr("transform", `translate(${cx},${cy})`)
        .attr("fill", "rgba(28,28,28,0.08)");

    svg.append("path")
        .attr("d", arc({ endAngle: -Math.PI / 2 + Math.PI * simulatedOps.docQuality / 100 }))
        .attr("transform", `translate(${cx},${cy})`)
        .attr("fill", "#c9f36a");

    svg.append("text")
        .attr("x", cx)
        .attr("y", cy - 32)
        .attr("text-anchor", "middle")
        .attr("fill", "#1c1c1c")
        .attr("font-size", 28)
        .attr("font-weight", 950)
        .text(`${simulatedOps.docQuality}`);

    svg.append("text")
        .attr("x", cx)
        .attr("y", cy - 8)
        .attr("text-anchor", "middle")
        .attr("fill", "#a7b1c1")
        .attr("font-size", 12)
        .attr("font-weight", 850)
        .text("quality score");
}

function renderAll() {
    renderNetwork();
    renderRegionalChart();
    renderProductChart();
    renderTariffChart();
    renderClearanceChart();
    renderExceptionsChart();
    renderExposureChart();
    renderQualityGauge();
}

renderAll();

let resizeTimer;
window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(renderAll, 180);
});
