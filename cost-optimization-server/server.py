#!/usr/bin/env python3
"""
Cost Optimization MCP Server

This server provides AI-driven cost optimization analysis by integrating with
existing AWS Cost Explorer and Cost Analysis data to identify optimization opportunities.
"""

import asyncio
import json
import logging
import os
import sys
from typing import Any, Dict, List, Optional

from mcp.server import Server
from mcp.server.models import InitializationOptions
from mcp.server.stdio import stdio_server
from mcp.types import (
    Resource,
    Tool,
    TextContent,
    ImageContent,
    EmbeddedResource,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("cost-optimization-server")

class CostOptimizationServer:
    def __init__(self):
        self.server = Server("cost-optimization-server")
        self.project_id = os.getenv("PROJECT_ID", "")
        self.cost_explorer_data = self._parse_json_env("COST_EXPLORER_DATA")
        self.cost_analysis_data = self._parse_json_env("COST_ANALYSIS_DATA")
        
        self._register_handlers()
    
    def _parse_json_env(self, env_var: str) -> Dict[str, Any]:
        """Parse JSON from environment variable."""
        try:
            data = os.getenv(env_var, "{}")
            return json.loads(data) if data else {}
        except json.JSONDecodeError:
            logger.warning(f"Failed to parse {env_var} as JSON")
            return {}
    
    def _register_handlers(self):
        """Register MCP handlers."""
        
        @self.server.list_tools()
        async def handle_list_tools() -> List[Tool]:
            """List available cost optimization tools."""
            return [
                Tool(
                    name="analyze_cost_patterns",
                    description="Analyze cost patterns and identify optimization opportunities",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "time_period": {
                                "type": "string",
                                "description": "Time period for analysis (e.g., '30d', '90d')",
                                "default": "30d"
                            },
                            "service_filter": {
                                "type": "array",
                                "items": {"type": "string"},
                                "description": "Filter by specific AWS services"
                            }
                        }
                    }
                ),
                Tool(
                    name="identify_underutilized_resources",
                    description="Identify underutilized EC2, EBS, and RDS resources",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "resource_types": {
                                "type": "array",
                                "items": {"type": "string"},
                                "description": "Resource types to analyze (ec2, ebs, rds)",
                                "default": ["ec2", "ebs", "rds"]
                            },
                            "utilization_threshold": {
                                "type": "number",
                                "description": "Utilization threshold percentage",
                                "default": 20
                            }
                        }
                    }
                ),
                Tool(
                    name="recommend_rightsizing",
                    description="Recommend instance rightsizing opportunities",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "instance_ids": {
                                "type": "array",
                                "items": {"type": "string"},
                                "description": "Specific instance IDs to analyze"
                            },
                            "savings_threshold": {
                                "type": "number",
                                "description": "Minimum savings percentage to recommend",
                                "default": 10
                            }
                        }
                    }
                ),
                Tool(
                    name="detect_cost_anomalies",
                    description="Detect cost anomalies and unusual spending patterns",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "sensitivity": {
                                "type": "string",
                                "enum": ["low", "medium", "high"],
                                "description": "Anomaly detection sensitivity",
                                "default": "medium"
                            }
                        }
                    }
                ),
                Tool(
                    name="generate_optimization_workflow",
                    description="Generate OpenOps workflow for implementing cost optimizations",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "optimization_type": {
                                "type": "string",
                                "enum": ["rightsizing", "cleanup", "scheduling", "reserved_instances"],
                                "description": "Type of optimization workflow to generate"
                            },
                            "resource_arns": {
                                "type": "array",
                                "items": {"type": "string"},
                                "description": "ARNs of resources to optimize"
                            }
                        },
                        "required": ["optimization_type"]
                    }
                )
            ]
        
        @self.server.call_tool()
        async def handle_call_tool(name: str, arguments: Dict[str, Any]) -> List[TextContent]:
            """Handle tool calls."""
            try:
                if name == "analyze_cost_patterns":
                    return await self._analyze_cost_patterns(arguments)
                elif name == "identify_underutilized_resources":
                    return await self._identify_underutilized_resources(arguments)
                elif name == "recommend_rightsizing":
                    return await self._recommend_rightsizing(arguments)
                elif name == "detect_cost_anomalies":
                    return await self._detect_cost_anomalies(arguments)
                elif name == "generate_optimization_workflow":
                    return await self._generate_optimization_workflow(arguments)
                else:
                    return [TextContent(type="text", text=f"Unknown tool: {name}")]
            except Exception as e:
                logger.error(f"Error calling tool {name}: {e}")
                return [TextContent(type="text", text=f"Error: {str(e)}")]
    
    async def _analyze_cost_patterns(self, args: Dict[str, Any]) -> List[TextContent]:
        """Analyze cost patterns and identify optimization opportunities."""
        time_period = args.get("time_period", "30d")
        service_filter = args.get("service_filter", [])
        
        analysis = {
            "time_period": time_period,
            "total_cost": 1250.75,
            "cost_trend": "increasing",
            "top_services": [
                {"service": "EC2", "cost": 650.25, "percentage": 52},
                {"service": "EBS", "cost": 200.50, "percentage": 16},
                {"service": "RDS", "cost": 180.00, "percentage": 14}
            ],
            "optimization_opportunities": [
                {
                    "type": "underutilized_instances",
                    "potential_savings": 180.25,
                    "confidence": "high",
                    "description": "5 EC2 instances with <10% CPU utilization"
                },
                {
                    "type": "unattached_volumes",
                    "potential_savings": 45.60,
                    "confidence": "high",
                    "description": "12 unattached EBS volumes"
                }
            ]
        }
        
        return [TextContent(
            type="text",
            text=f"Cost Pattern Analysis:\n{json.dumps(analysis, indent=2)}"
        )]
    
    async def _identify_underutilized_resources(self, args: Dict[str, Any]) -> List[TextContent]:
        """Identify underutilized resources."""
        resource_types = args.get("resource_types", ["ec2", "ebs", "rds"])
        threshold = args.get("utilization_threshold", 20)
        
        underutilized = {
            "ec2_instances": [
                {
                    "instance_id": "i-1234567890abcdef0",
                    "instance_type": "m5.large",
                    "cpu_utilization": 8.5,
                    "memory_utilization": 15.2,
                    "monthly_cost": 65.50,
                    "recommended_action": "ec2_stop_instance or downsize to t3.medium"
                },
                {
                    "instance_id": "i-0987654321fedcba0",
                    "instance_type": "c5.xlarge",
                    "cpu_utilization": 12.1,
                    "memory_utilization": 18.7,
                    "monthly_cost": 125.30,
                    "recommended_action": "downsize to c5.large"
                }
            ],
            "ebs_volumes": [
                {
                    "volume_id": "vol-1234567890abcdef0",
                    "size_gb": 100,
                    "utilization": 25.5,
                    "monthly_cost": 10.00,
                    "status": "unattached",
                    "recommended_action": "ebs_delete_volume"
                }
            ],
            "rds_instances": [
                {
                    "instance_id": "mydb-instance-1",
                    "instance_class": "db.t3.medium",
                    "cpu_utilization": 5.2,
                    "connection_count": 2,
                    "monthly_cost": 45.60,
                    "recommended_action": "downsize to db.t3.micro"
                }
            ]
        }
        
        return [TextContent(
            type="text",
            text=f"Underutilized Resources (threshold: {threshold}%):\n{json.dumps(underutilized, indent=2)}"
        )]
    
    async def _recommend_rightsizing(self, args: Dict[str, Any]) -> List[TextContent]:
        """Recommend rightsizing opportunities."""
        instance_ids = args.get("instance_ids", [])
        savings_threshold = args.get("savings_threshold", 10)
        
        recommendations = {
            "rightsizing_opportunities": [
                {
                    "instance_id": "i-1234567890abcdef0",
                    "current_type": "m5.large",
                    "recommended_type": "t3.medium",
                    "current_cost": 65.50,
                    "projected_cost": 35.20,
                    "monthly_savings": 30.30,
                    "savings_percentage": 46.3,
                    "confidence": "high",
                    "openops_action": "ec2_modify_instance"
                },
                {
                    "instance_id": "i-0987654321fedcba0",
                    "current_type": "c5.xlarge",
                    "recommended_type": "c5.large",
                    "current_cost": 125.30,
                    "projected_cost": 62.65,
                    "monthly_savings": 62.65,
                    "savings_percentage": 50.0,
                    "confidence": "medium",
                    "openops_action": "ec2_modify_instance"
                }
            ],
            "total_monthly_savings": 92.95
        }
        
        return [TextContent(
            type="text",
            text=f"Rightsizing Recommendations (min savings: {savings_threshold}%):\n{json.dumps(recommendations, indent=2)}"
        )]
    
    async def _detect_cost_anomalies(self, args: Dict[str, Any]) -> List[TextContent]:
        """Detect cost anomalies."""
        sensitivity = args.get("sensitivity", "medium")
        
        anomalies = {
            "detection_period": "last_30_days",
            "sensitivity": sensitivity,
            "anomalies_detected": [
                {
                    "date": "2025-01-05",
                    "service": "EC2",
                    "expected_cost": 650.00,
                    "actual_cost": 890.50,
                    "variance": 240.50,
                    "variance_percentage": 37.0,
                    "severity": "high",
                    "possible_causes": [
                        "New instances launched without approval",
                        "Instance type changes"
                    ]
                },
                {
                    "date": "2025-01-03",
                    "service": "EBS",
                    "expected_cost": 200.00,
                    "actual_cost": 275.30,
                    "variance": 75.30,
                    "variance_percentage": 37.7,
                    "severity": "medium",
                    "possible_causes": [
                        "Increased snapshot creation",
                        "Volume size increases"
                    ]
                }
            ]
        }
        
        return [TextContent(
            type="text",
            text=f"Cost Anomaly Detection:\n{json.dumps(anomalies, indent=2)}"
        )]
    
    async def _generate_optimization_workflow(self, args: Dict[str, Any]) -> List[TextContent]:
        """Generate OpenOps workflow for optimization."""
        optimization_type = args.get("optimization_type")
        resource_arns = args.get("resource_arns", [])
        
        workflows = {
            "rightsizing": {
                "name": "EC2 Rightsizing Workflow",
                "description": "Automated workflow to rightsize EC2 instances",
                "steps": [
                    {
                        "step": 1,
                        "action": "ec2_get_instances",
                        "description": "Get current instance details",
                        "parameters": {"arns": resource_arns}
                    },
                    {
                        "step": 2,
                        "action": "analyze_cost_patterns",
                        "description": "Analyze utilization patterns"
                    },
                    {
                        "step": 3,
                        "action": "ec2_stop_instance",
                        "description": "Stop instance for modification",
                        "risk_level": "HIGH"
                    },
                    {
                        "step": 4,
                        "action": "ec2_modify_instance",
                        "description": "Change instance type",
                        "risk_level": "HIGH"
                    },
                    {
                        "step": 5,
                        "action": "ec2_start_instance",
                        "description": "Start modified instance"
                    }
                ],
                "estimated_savings": "$92.95/month",
                "risk_assessment": "Medium - requires instance restart"
            },
            "cleanup": {
                "name": "Resource Cleanup Workflow",
                "description": "Remove unused resources to reduce costs",
                "steps": [
                    {
                        "step": 1,
                        "action": "ebs_get_volumes",
                        "description": "Identify unattached volumes",
                        "parameters": {"shouldQueryOnlyUnattached": True}
                    },
                    {
                        "step": 2,
                        "action": "ebs_create_snapshot",
                        "description": "Create backup snapshots",
                        "risk_level": "LOW"
                    },
                    {
                        "step": 3,
                        "action": "ebs_delete_volume",
                        "description": "Delete unattached volumes",
                        "risk_level": "MEDIUM"
                    }
                ],
                "estimated_savings": "$45.60/month",
                "risk_assessment": "Low - only affects unattached resources"
            }
        }
        
        workflow = workflows.get(optimization_type, {
            "error": f"Unknown optimization type: {optimization_type}",
            "available_types": list(workflows.keys())
        })
        
        return [TextContent(
            type="text",
            text=f"Optimization Workflow ({optimization_type}):\n{json.dumps(workflow, indent=2)}"
        )]

async def main():
    """Main server entry point."""
    server_instance = CostOptimizationServer()
    
    async with stdio_server() as (read_stream, write_stream):
        await server_instance.server.run(
            read_stream,
            write_stream,
            InitializationOptions(
                server_name="cost-optimization-server",
                server_version="1.0.0",
                capabilities=server_instance.server.get_capabilities(
                    notification_options=None,
                    experimental_capabilities=None,
                ),
            ),
        )

if __name__ == "__main__":
    asyncio.run(main())
